using System;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using System.Windows.Media.Effects;
using System.Windows.Threading;
using DPFP;
using DPFP.Capture;
using DPFP.Processing;
using DPFP.Verification;
using System.IO;
using System.Collections.Generic;
using System.Windows.Input;
using System.Web.Script.Serialization;
using System.Linq;
using System.Net;
using System.Windows.Data;
using System.Runtime.InteropServices;

namespace KioskNative
{
    public partial class MainWindow : Window, DPFP.Capture.EventHandler
    {
        [DllImport("kernel32.dll", SetLastError = true)]
        private static extern IntPtr LoadLibrary(string dllToLoad);

        [DllImport("kernel32.dll", SetLastError = true)]
        private static extern bool FreeLibrary(IntPtr hModule);
        private bool _driverExists = false;
        private bool _isProcessingScan = false;
        private Capture _capturer;
        private string _mode = "attendance";
        private Enrollment _enrollment;
        private Verification _verifier;
        private AppConfig _config;
        private ApiClient _api;
        private LocalDb _db;
        
        private DispatcherTimer _beaconTimer;
        private DispatcherTimer _syncTimer;
        private bool _isMaintenance = false;
        private Dictionary<string, DateTime> _cooldowns = new Dictionary<string, DateTime>();
        private string _branchName = "";
        private AgentServer _agentServer;
        private object _latestScan = new { status = "WAITING", timestamp = 0 };
        private List<StaffRecord> _staffCache = new List<StaffRecord>();
        private string _enrollingStaffId = "";
        private int _enrollmentSuccessCount = 0;
        private int _enrollmentMismatchCount = 0;
        private List<FeatureSet> _enrollmentSamples = new List<FeatureSet>();
        
        private double? _latitude = null;
        private double? _longitude = null;
        private string _primaryTemplateB64 = "";
        
        private Dictionary<string, List<DPFP.Template>> _parsedTemplates = new Dictionary<string, List<DPFP.Template>>();
        private readonly object _templateLock = new object();

        private void RefreshTemplateCache()
        {
            lock (_templateLock)
            {
                _parsedTemplates.Clear();
                if (_staffCache == null) return;
                foreach (var staff in _staffCache)
                {
                    if (!string.IsNullOrEmpty(staff.template_b64))
                    {
                        try
                        {
                            string[] parts = staff.template_b64.Split(',');
                            List<DPFP.Template> temps = new List<DPFP.Template>();
                            foreach(string p in parts) {
                                if (string.IsNullOrWhiteSpace(p)) continue;
                                byte[] templateBytes = Convert.FromBase64String(p);
                                DPFP.Template template = new DPFP.Template();
                                using (MemoryStream ms = new MemoryStream(templateBytes))
                                {
                                    template.DeSerialize(ms);
                                }
                                temps.Add(template);
                            }
                            if (temps.Count > 0)
                                _parsedTemplates[staff.id] = temps;
                        }
                        catch (Exception ex)
                        {
                            Log("Template Parse Error for Staff " + staff.id + ": " + ex.Message);
                        }
                    }
                }
            }
        }
        
        private Grid BlockerGrid;
        private Grid SettingsGrid;
        private Grid PinGrid; // Attendance PIN
        private Grid EnrollmentPinGrid; // Enrollment PIN setup
        private TextBox TxtEnrollmentPinInput;
        private StaffRecord _currentEnrollingStaff;
        private string _tempEnrollPin = "";
        private TextBox TxtPin;
        private string _pinStaffPersonnelNo = "";

        private TextBox TxtErpUrl;
        private TextBlock BlockerTitle;
        private TextBlock BlockerStatus;
        
        private Border ProfileCardBorder;

        // Dynamic branding fields
        private TextBlock TxtBrandSide;
        private TextBlock TxtBrandMain;
        private Image ImgLogoSide;
        // private Image ImgLogoMain; // we don't have a main header logo right now, just side

        private TextBlock TxtScannerStatus;
        private TextBlock TxtLanStatus;
        private TextBlock TxtInternetStatus;
        private TextBlock TxtScanMessage;
        private TextBlock TxtScanSubMessage;
        private StackPanel ProgressDots;
        private TextBlock TxtBigFingerprint;
        private Border[] DotElements;
        private Border ViewAttendance;
        private Border ViewEnrollment;
        private Button BtnAttendance;
        private Button BtnEnrollment;
        private TextBlock TxtBranchName;
        private ListBox LstStaff;
        private Button BtnUsePin;
        
        private Grid ProfileOverlayGrid;
        private Image ProfilePhoto;
        private TextBlock ProfileName;
        private TextBlock ProfileRole;
        private TextBlock ProfileDept;
        private TextBlock ProfileId;
        private TextBlock ProfileBranch;
        private TextBlock ProfileTime;
        private TextBlock ProfileStatusBadge;
        private DispatcherTimer _profileTimer;

        private void Log(string message)
        {
            try {
                string dir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "Proxima-Kiosk");
                if (!Directory.Exists(dir)) Directory.CreateDirectory(dir);
                string logPath = Path.Combine(dir, "kiosk_debug.log");
                
                // Truncate logs if size exceeds 5MB to save disk space and performance
                try {
                    FileInfo fi = new FileInfo(logPath);
                    if (fi.Exists && fi.Length > 5 * 1024 * 1024) {
                        File.Delete(logPath);
                    }
                } catch { }

                string timestamp = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");
                File.AppendAllText(logPath, string.Format("[{0}] {1}\n", timestamp, message));
            } catch { }
        }

        public MainWindow()
        {
            InitializeComponent();

            try
            {
                // Prevent fatal GC crash on missing drivers by avoiding instantiation
                _driverExists = false;
                try {
                    IntPtr hMod = LoadLibrary("DPFPApi.dll");
                    if (hMod != IntPtr.Zero) {
                        _driverExists = true;
                        FreeLibrary(hMod);
                    }
                } catch { }

                if (_driverExists)
                {
                    _verifier = new DPFP.Verification.Verification();
                    _capturer = new DPFP.Capture.Capture();
                    if (_capturer != null) {
                        _capturer.EventHandler = this;
                    }
                }
                else
                {
                    MessageBox.Show("DigitalPersona RTE drivers are not installed on this machine. Fingerprint scanning will be disabled.", "Missing Drivers", MessageBoxButton.OK, MessageBoxImage.Warning);
                }
            }
            catch (Exception)
            {
                MessageBox.Show("DigitalPersona RTE drivers failed to initialize. Fingerprint scanning will be disabled.", "Driver Error", MessageBoxButton.OK, MessageBoxImage.Warning);
            }

            _db = new LocalDb();
            AppDomain.CurrentDomain.UnhandledException += (s, e) => {
                Log("FATAL UNHANDLED: " + e.ExceptionObject.ToString());
            };
            Dispatcher.UnhandledException += (s, e) => {
                Log("UI UNHANDLED: " + e.Exception.ToString());
                e.Handled = true;
            };

            try {
                Log("APP STARTING...");
                _config = AppConfig.Load();
                _db = new LocalDb();
                _api = new ApiClient(_config);

                // Set Window Icon from real logo
                try {
                    string iconPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "logo.png");
                    if (File.Exists(iconPath)) {
                        this.Icon = System.Windows.Media.Imaging.BitmapFrame.Create(new Uri(iconPath));
                    }
                } catch { }

                BuildUI();
                
                this.Loaded += MainWindow_Loaded;
                this.Closed += MainWindow_Closed;
                this.KeyDown += MainWindow_KeyDown; // Add keyboard shortcut support

                _agentServer = new AgentServer(this);
                _agentServer.Start();

                StartTimers();
                Log("APP INITIALIZED SUCCESSFULLY");
            } catch (Exception ex) {
                Log("STARTUP CRASH: " + ex.ToString());
                MessageBox.Show("Startup Error: " + ex.Message + "\nSee logs for details.");
            }
        }

        private void NetworkTimer_Tick(object sender, EventArgs e)
        {
            System.Threading.Thread thread = new System.Threading.Thread(new System.Threading.ThreadStart(delegate()
            {
                bool lanOk = false;
                bool webOk = false;

                // Check LAN (ERP)
                try {
                    var req = WebRequest.Create(_config.ERP_ENDPOINTS[0]);
                    req.Timeout = 3000;
                    using (var res = req.GetResponse()) lanOk = true;
                } catch { }

                // Check Internet
                try {
                    var req = WebRequest.Create("http://www.google.com");
                    req.Timeout = 3000;
                    using (var res = req.GetResponse()) webOk = true;
                } catch { }

                Dispatcher.Invoke(new Action(delegate()
                {
                    if (TxtLanStatus != null) TxtLanStatus.Foreground = lanOk ? new SolidColorBrush(Color.FromRgb(16, 124, 16)) : Brushes.Red;
                    if (TxtInternetStatus != null) TxtInternetStatus.Foreground = webOk ? new SolidColorBrush(Color.FromRgb(16, 124, 16)) : Brushes.Red;
                }));
            }));
            thread.IsBackground = true;
            thread.Start();
        }

        private void StartTimers()
        {
            _beaconTimer = new DispatcherTimer();
            _beaconTimer.Interval = TimeSpan.FromSeconds(10);
            _beaconTimer.Tick += new System.EventHandler(BeaconTimer_Tick);
            _beaconTimer.Start();

            _syncTimer = new DispatcherTimer();
            _syncTimer.Interval = TimeSpan.FromMinutes(1);
            _syncTimer.Tick += new System.EventHandler(SyncTimer_Tick);
            _syncTimer.Start();

            DispatcherTimer networkTimer = new DispatcherTimer();
            networkTimer.Interval = TimeSpan.FromSeconds(10);
            networkTimer.Tick += NetworkTimer_Tick;
            networkTimer.Start();
        }

        private void BeaconTimer_Tick(object sender, EventArgs e)
        {
            System.Threading.Thread thread = new System.Threading.Thread(new System.Threading.ThreadStart(delegate()
            {
                string response = _api.Get("/api/v1/kiosk/heartbeat");
                if (!string.IsNullOrEmpty(response))
                {
                    JavaScriptSerializer json = new JavaScriptSerializer();
                    try
                    {
                        Dictionary<string, object> data = json.Deserialize<Dictionary<string, object>>(response);
                        if (data.ContainsKey("status"))
                        {
                            string status = (string)data["status"];
                            if (status == "ACTIVE")
                            {
                                if (!_config.IS_ACTIVATED)
                                {
                                    _config.IS_ACTIVATED = true;
                                    _config.Save();
                                    Dispatcher.Invoke(new Action(delegate() { 
                                        BlockerGrid.Visibility = Visibility.Collapsed;
                                        InitScanner();
                                        ResetWaiting();
                                        SyncTimer_Tick(null, null); // Trigger initial sync
                                    }));
                                }
                                _isMaintenance = false;
                            }
                            else if (status == "MAINTENANCE")
                            {
                                _isMaintenance = true;
                                Dispatcher.Invoke(new Action(delegate() { 
                                    BlockerGrid.Visibility = Visibility.Visible;
                                    BlockerTitle.Text = "Maintenance Mode";
                                    BlockerStatus.Text = "This terminal is currently offline for maintenance.";
                                }));
                            }
                            else
                            {
                                _config.IS_ACTIVATED = false;
                                Dispatcher.Invoke(new Action(delegate() { 
                                    BlockerGrid.Visibility = Visibility.Visible;
                                    BlockerTitle.Text = "Terminal Registration";
                                    BlockerStatus.Text = "Terminal ID: " + _config.TERMINAL_ID + "\nWaiting for administrator approval...";
                                }));
                            }

                            if (data.ContainsKey("branch_name")) {
                                _branchName = (string)data["branch_name"];
                                Dispatcher.Invoke(new Action(delegate() { TxtBranchName.Text = _branchName.ToUpper(); }));
                            }

                            if (data.ContainsKey("schoolName") && data["schoolName"] != null) {
                                string scName = data["schoolName"].ToString();
                                Dispatcher.Invoke(new Action(delegate() {
                                    if (TxtBrandMain != null) TxtBrandMain.Text = scName.ToUpper();
                                    if (TxtBrandSide != null) TxtBrandSide.Text = scName.ToUpper();
                                }));
                            }

                            if (data.ContainsKey("logo_url") && data["logo_url"] != null) {
                                string lUrl = data["logo_url"].ToString();
                                if (!string.IsNullOrEmpty(lUrl)) {
                                    Dispatcher.Invoke(new Action(delegate() {
                                        try {
                                            if (ImgLogoSide != null) {
                                                ImgLogoSide.Source = System.Windows.Media.Imaging.BitmapFrame.Create(new Uri(lUrl));
                                            }
                                        } catch { }
                                    }));
                                }
                            }
                        }
                    }
                    catch { }
                }
            }));
            thread.IsBackground = true;
            thread.Start();
        }

        private void MainWindow_KeyDown(object sender, KeyEventArgs e)
        {
            // Ctrl + Alt + S to open settings
            if ((Keyboard.Modifiers & ModifierKeys.Control) != 0 && 
                (Keyboard.Modifiers & ModifierKeys.Alt) != 0 && 
                e.Key == Key.S)
            {
                SettingsGrid.Visibility = Visibility.Visible;
                TxtErpUrl.Focus();
            }
        }

        private void SyncTimer_Tick(object sender, EventArgs e)
        {
            if (!_config.IS_ACTIVATED || _isMaintenance) return;

            System.Threading.Thread thread = new System.Threading.Thread(new System.Threading.ThreadStart(delegate()
            {
                // 0. Sync Pending Enrollments
                List<PendingEnrollment> pendingEnrollments = _db.LoadPendingEnrollments();
                foreach (var pe in pendingEnrollments)
                {
                    Dictionary<string, object> payload = new Dictionary<string, object>();
                    payload.Add("staff_id", pe.staff_id);
                    payload.Add("template", pe.template_b64);
                    if (!string.IsNullOrEmpty(pe.pin)) payload.Add("pin", pe.pin);
                    
                    string resp = _api.Post("/api/v1/kiosk/enroll", payload);
                    if (!string.IsNullOrEmpty(resp)) {
                        _db.RemovePendingEnrollment(pe.staff_id);
                    }
                }

                // 1. Sync Staff
                Log("Sync: Fetching staff...");
                string staffRes = _api.Get("/api/v1/kiosk/staff");
                if (!string.IsNullOrEmpty(staffRes))
                {
                    JavaScriptSerializer json = new JavaScriptSerializer();
                    try
                    {
                        Dictionary<string, object> res = json.Deserialize<Dictionary<string, object>>(staffRes);
                        if (res.ContainsKey("data"))
                        {
                            // 1a. Load current local state to preserve offline templates
                            List<StaffRecord> localStaff = _db.LoadStaff();
                            Dictionary<string, string> localTemplates = new Dictionary<string, string>();
                            foreach (var ls in localStaff) if (!string.IsNullOrEmpty(ls.template_b64)) localTemplates[ls.id] = ls.template_b64;

                            List<StaffRecord> remoteStaff = new List<StaffRecord>();
                            var staffList = (System.Collections.IEnumerable)res["data"];
                            int count = 0;
                            foreach (Dictionary<string, object> item in staffList)
                            {
                                string sid = item["id"].ToString();
                                string remoteTpl = item.ContainsKey("template") && item["template"] != null ? (string)item["template"] : null;
                                
                                bool isEnrolled = item.ContainsKey("is_enrolled") && item["is_enrolled"] != null ? Convert.ToBoolean(item["is_enrolled"]) : false;
                                bool isPending = _db.IsEnrollmentPending(sid);

                                if (!isEnrolled && !isPending) {
                                    // ERP explicitly states they are not enrolled
                                    remoteTpl = "";
                                }
                                
                                if (string.IsNullOrEmpty(remoteTpl) && localTemplates.ContainsKey(sid) && !string.IsNullOrEmpty(localTemplates[sid])) {
                                    // Preserve local template if ERP doesn't provide one (e.g. backend lag)
                                    remoteTpl = localTemplates[sid];
                                }

                                 remoteStaff.Add(new StaffRecord() {
                                    id = sid,
                                    name = (string)item["name"],
                                    template_b64 = remoteTpl,
                                    personnel_number = item.ContainsKey("personnel_number") && item["personnel_number"] != null ? (string)item["personnel_number"] : "",
                                    role = item.ContainsKey("role") && item["role"] != null ? (string)item["role"] : "",
                                    department = item.ContainsKey("department") && item["department"] != null ? (string)item["department"] : "",
                                    photo_url = item.ContainsKey("photo_url") && item["photo_url"] != null ? (string)item["photo_url"] : "",
                                    working_days = item.ContainsKey("working_days") && item["working_days"] != null ? (string)item["working_days"] : "",
                                    shift_start = item.ContainsKey("shift_start") && item["shift_start"] != null ? (string)item["shift_start"] : "08:00:00",
                                    shift_end = item.ContainsKey("shift_end") && item["shift_end"] != null ? (string)item["shift_end"] : "17:00:00",
                                    grace_period = item.ContainsKey("grace_period") && item["grace_period"] != null ? Convert.ToInt32(item["grace_period"]) : 15
                                });
                                count++;
                            }
                            Log("Sync: Merged " + count + " staff records (preserved " + localTemplates.Count + " local templates)");
                            _db.SaveStaff(remoteStaff);
                            _staffCache = remoteStaff;
                            RefreshTemplateCache();
                            
                            Dispatcher.Invoke(new Action(delegate() { 
                                if (LstStaff != null) LstStaff.ItemsSource = _staffCache; 
                            }));
                        }
                    }
                    catch (Exception ex)
                    {
                        Log("Sync Error (Staff): " + ex.Message);
                    }
                }

                // 2. Sync Attendance
                List<AttendanceRecord> pending = _db.LoadPendingAttendance();
                if (pending.Count > 0)
                {
                    Dictionary<string, object> syncPayload = new Dictionary<string, object>();
                    syncPayload.Add("logs", pending);
                    string response = _api.Post("/api/v1/kiosk/sync-attendance", syncPayload);
                    if (!string.IsNullOrEmpty(response))
                    {
                        _db.MarkAsSynced(pending);
                    }
                }
            }));
            thread.IsBackground = true;
            thread.Start();
        }

        private void BuildUI()
        {
            this.Title = "Proxima Kiosk";
            this.Width = 1200;
            this.Height = 800;
            this.WindowStyle = WindowStyle.None;
            this.WindowState = WindowState.Maximized;
            this.Background = new SolidColorBrush(Color.FromRgb(242, 242, 242));
            this.FontFamily = new FontFamily("Segoe UI");

            // Set Window Icon (Taskbar & Window Title)
            try {
                DrawingGroup iconGroup = new DrawingGroup();
                iconGroup.Children.Add(new GeometryDrawing(new SolidColorBrush(Color.FromRgb(0, 120, 215)), null, new EllipseGeometry(new Point(16, 16), 16, 16)));
                iconGroup.Children.Add(new GeometryDrawing(Brushes.White, null, Geometry.Parse("M16,6 L19,11 L25,11 L20,15 L22,21 L16,18 L10,21 L12,15 L7,11 L13,11 Z")));
                this.Icon = new DrawingImage(iconGroup);
            } catch { }

            Grid rootGrid = new Grid();
            this.Content = rootGrid;

            Grid mainGrid = new Grid();
            ColumnDefinition col1 = new ColumnDefinition();
            col1.Width = new GridLength(280);
            mainGrid.ColumnDefinitions.Add(col1);
            ColumnDefinition col2 = new ColumnDefinition();
            col2.Width = new GridLength(1, GridUnitType.Star);
            mainGrid.ColumnDefinitions.Add(col2);
            rootGrid.Children.Add(mainGrid);

            // Sidebar
            Border sidebarBorder = new Border();
            sidebarBorder.Background = Brushes.White;
            sidebarBorder.BorderBrush = new SolidColorBrush(Color.FromRgb(226, 232, 240));
            sidebarBorder.BorderThickness = new Thickness(0, 0, 1, 0);
            Grid.SetColumn(sidebarBorder, 0);
            mainGrid.Children.Add(sidebarBorder);

            Grid sidebarGrid = new Grid();
            RowDefinition row1 = new RowDefinition();
            row1.Height = GridLength.Auto;
            sidebarGrid.RowDefinitions.Add(row1);
            RowDefinition row2 = new RowDefinition();
            row2.Height = GridLength.Auto;
            sidebarGrid.RowDefinitions.Add(row2);
            RowDefinition row3 = new RowDefinition();
            row3.Height = new GridLength(1, GridUnitType.Star);
            sidebarGrid.RowDefinitions.Add(row3);
            RowDefinition row4 = new RowDefinition();
            row4.Height = GridLength.Auto;
            sidebarGrid.RowDefinitions.Add(row4);
            sidebarBorder.Child = sidebarGrid;

            Border brandBorder = new Border();
            brandBorder.Padding = new Thickness(20);
            brandBorder.BorderBrush = new SolidColorBrush(Color.FromRgb(226, 232, 240));
            brandBorder.BorderThickness = new Thickness(0, 0, 0, 1);
            
            StackPanel brandStack = new StackPanel();
            brandStack.Orientation = Orientation.Horizontal;
            
            // Real Al-Babello Logo from PNG
            ImgLogoSide = new Image();
            ImgLogoSide.Width = 40;
            ImgLogoSide.Height = 40;
            ImgLogoSide.Margin = new Thickness(0, 0, 12, 0);
            try {
                string logoPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "logo.png");
                if (File.Exists(logoPath)) {
                    ImgLogoSide.Source = System.Windows.Media.Imaging.BitmapFrame.Create(new Uri(logoPath));
                }
            } catch { }
            brandStack.Children.Add(ImgLogoSide);

            TxtBrandSide = new TextBlock();
            TxtBrandSide.Text = "PROXIMA";
            TxtBrandSide.VerticalAlignment = VerticalAlignment.Center;
            TxtBrandSide.FontWeight = FontWeights.Bold;
            TxtBrandSide.Foreground = new SolidColorBrush(Color.FromRgb(30, 41, 59));
            TxtBrandSide.FontSize = 16;
            brandStack.Children.Add(TxtBrandSide);
            
            brandBorder.Child = brandStack;
            Grid.SetRow(brandBorder, 0);
            sidebarGrid.Children.Add(brandBorder);

            StackPanel navPanel = new StackPanel();
            navPanel.Margin = new Thickness(10, 20, 10, 0);
            BtnAttendance = new Button();
            BtnAttendance.Content = "Attendance Mode";
            BtnAttendance.Background = new SolidColorBrush(Color.FromRgb(235, 245, 255));
            BtnAttendance.Foreground = new SolidColorBrush(Color.FromRgb(0, 120, 215));
            BtnAttendance.FontWeight = FontWeights.SemiBold;
            BtnAttendance.FontSize = 16;
            BtnAttendance.Padding = new Thickness(15);
            BtnAttendance.Margin = new Thickness(0, 0, 0, 10);
            BtnAttendance.BorderThickness = new Thickness(0);
            BtnAttendance.HorizontalContentAlignment = HorizontalAlignment.Left;
            BtnAttendance.Click += new RoutedEventHandler(BtnAttendance_Click);

            BtnEnrollment = new Button();
            BtnEnrollment.Content = "Staff Enrollment";
            BtnEnrollment.Background = Brushes.Transparent;
            BtnEnrollment.Foreground = new SolidColorBrush(Color.FromRgb(100, 116, 139));
            BtnEnrollment.FontWeight = FontWeights.SemiBold;
            BtnEnrollment.FontSize = 16;
            BtnEnrollment.Padding = new Thickness(15);
            BtnEnrollment.BorderThickness = new Thickness(0);
            BtnEnrollment.HorizontalContentAlignment = HorizontalAlignment.Left;
            BtnEnrollment.Click += new RoutedEventHandler(BtnEnrollment_Click);

            navPanel.Children.Add(BtnAttendance);
            navPanel.Children.Add(BtnEnrollment);
            Grid.SetRow(navPanel, 1);
            sidebarGrid.Children.Add(navPanel);

            StackPanel exitPanel = new StackPanel();
            exitPanel.Margin = new Thickness(10, 0, 10, 20);
            Button btnReset = new Button();
            btnReset.Content = "Reset Scanner";
            btnReset.Background = Brushes.Transparent;
            btnReset.Foreground = new SolidColorBrush(Color.FromRgb(100, 116, 139));
            btnReset.FontWeight = FontWeights.SemiBold;
            btnReset.FontSize = 16;
            btnReset.Padding = new Thickness(15);
            btnReset.BorderThickness = new Thickness(0);
            btnReset.HorizontalContentAlignment = HorizontalAlignment.Left;

            Button btnExit = new Button();
            btnExit.Content = "Exit Application";
            btnExit.Background = Brushes.Transparent;
            btnExit.Foreground = new SolidColorBrush(Color.FromRgb(232, 17, 35));
            btnExit.FontWeight = FontWeights.SemiBold;
            btnExit.FontSize = 16;
            btnExit.Padding = new Thickness(15);
            btnExit.BorderThickness = new Thickness(0);
            btnExit.HorizontalContentAlignment = HorizontalAlignment.Left;
            btnExit.Click += new RoutedEventHandler(BtnExit_Click);

            exitPanel.Children.Add(btnReset);
            exitPanel.Children.Add(btnExit);

            Button btnSettings = new Button();
            btnSettings.Content = "Configure Server (Ctrl+Alt+S)";
            btnSettings.Background = Brushes.Transparent;
            btnSettings.Foreground = Brushes.Gray;
            btnSettings.FontSize = 12;
            btnSettings.Padding = new Thickness(15, 5, 15, 5);
            btnSettings.BorderThickness = new Thickness(0);
            btnSettings.HorizontalAlignment = HorizontalAlignment.Left;
            btnSettings.Click += (s, e) => { SettingsGrid.Visibility = Visibility.Visible; TxtErpUrl.Focus(); };
            exitPanel.Children.Add(btnSettings);

            Grid.SetRow(exitPanel, 3);
            sidebarGrid.Children.Add(exitPanel);

            // Main Content Area
            Grid contentGrid = new Grid();
            RowDefinition contentRow1 = new RowDefinition();
            contentRow1.Height = new GridLength(70);
            contentGrid.RowDefinitions.Add(contentRow1);
            RowDefinition contentRow2 = new RowDefinition();
            contentRow2.Height = new GridLength(1, GridUnitType.Star);
            contentGrid.RowDefinitions.Add(contentRow2);
            Grid.SetColumn(contentGrid, 1);
            mainGrid.Children.Add(contentGrid);

            // Header
            Border headerBorder = new Border();
            headerBorder.Background = Brushes.White;
            headerBorder.BorderBrush = new SolidColorBrush(Color.FromRgb(226, 232, 240));
            headerBorder.BorderThickness = new Thickness(0, 0, 0, 1);
            headerBorder.Padding = new Thickness(20, 0, 20, 0);

            Grid headerGrid = new Grid();
            StackPanel leftHeader = new StackPanel();
            leftHeader.Orientation = Orientation.Horizontal;
            leftHeader.VerticalAlignment = VerticalAlignment.Center;
            TxtBrandMain = new TextBlock();
            TxtBrandMain.Text = "PROXIMA";
            TxtBrandMain.FontWeight = FontWeights.Black;
            TxtBrandMain.Foreground = new SolidColorBrush(Color.FromRgb(0, 120, 215));
            TxtBrandMain.FontSize = 20;
            TxtBrandMain.VerticalAlignment = VerticalAlignment.Center;
            leftHeader.Children.Add(TxtBrandMain);

            TextBlock brandSub = new TextBlock();
            brandSub.Text = "BIOMETRIC TERMINAL v1.0";
            brandSub.FontWeight = FontWeights.SemiBold;
            brandSub.Foreground = new SolidColorBrush(Color.FromRgb(102, 102, 102));
            brandSub.FontSize = 12;
            brandSub.Margin = new Thickness(10, 4, 0, 0);
            brandSub.VerticalAlignment = VerticalAlignment.Center;
            leftHeader.Children.Add(brandSub);
            headerGrid.Children.Add(leftHeader);

            StackPanel rightHeader = new StackPanel();
            rightHeader.Orientation = Orientation.Horizontal;
            rightHeader.HorizontalAlignment = HorizontalAlignment.Right;
            rightHeader.VerticalAlignment = VerticalAlignment.Center;

            Border statusBorder = new Border();
            statusBorder.Background = new SolidColorBrush(Color.FromRgb(230, 255, 237));
            statusBorder.BorderBrush = new SolidColorBrush(Color.FromRgb(16, 124, 16));
            statusBorder.BorderThickness = new Thickness(1);
            statusBorder.CornerRadius = new CornerRadius(15);
            statusBorder.Padding = new Thickness(15, 5, 15, 5);
            statusBorder.Margin = new Thickness(0, 0, 10, 0);
            TxtScannerStatus = new TextBlock();
            TxtScannerStatus.Text = "Scanner Online";
            TxtScannerStatus.Foreground = new SolidColorBrush(Color.FromRgb(16, 124, 16));
            TxtScannerStatus.FontWeight = FontWeights.Bold;
            TxtScannerStatus.FontSize = 12;
            statusBorder.Child = TxtScannerStatus;

            Border branchBorder = new Border();
            branchBorder.Background = new SolidColorBrush(Color.FromRgb(230, 255, 237));
            branchBorder.BorderBrush = new SolidColorBrush(Color.FromRgb(16, 124, 16));
            branchBorder.BorderThickness = new Thickness(1);
            branchBorder.CornerRadius = new CornerRadius(15);
            branchBorder.Padding = new Thickness(15, 5, 15, 5);
            TxtBranchName = new TextBlock();
            TxtBranchName.Text = "BRANCH";
            TxtBranchName.Foreground = new SolidColorBrush(Color.FromRgb(16, 124, 16));
            TxtBranchName.FontWeight = FontWeights.Bold;
            TxtBranchName.FontSize = 12;
            branchBorder.Child = TxtBranchName;

            rightHeader.Children.Add(statusBorder);

            // LAN Status
            Border lanBorder = new Border();
            lanBorder.Background = new SolidColorBrush(Color.FromRgb(240, 240, 240));
            lanBorder.Padding = new Thickness(10, 5, 10, 5);
            lanBorder.CornerRadius = new CornerRadius(10);
            lanBorder.Margin = new Thickness(0, 0, 10, 0);
            TxtLanStatus = new TextBlock() { Text = "LAN", FontSize = 10, FontWeight = FontWeights.Bold, Foreground = Brushes.Gray };
            lanBorder.Child = TxtLanStatus;
            rightHeader.Children.Add(lanBorder);

            // Internet Status
            Border netBorder = new Border();
            netBorder.Background = new SolidColorBrush(Color.FromRgb(240, 240, 240));
            netBorder.Padding = new Thickness(10, 5, 10, 5);
            netBorder.CornerRadius = new CornerRadius(10);
            netBorder.Margin = new Thickness(0, 0, 10, 0);
            TxtInternetStatus = new TextBlock() { Text = "WEB", FontSize = 10, FontWeight = FontWeights.Bold, Foreground = Brushes.Gray };
            netBorder.Child = TxtInternetStatus;
            rightHeader.Children.Add(netBorder);

            // rightHeader.Children.Add(branchBorder);
            headerGrid.Children.Add(rightHeader);
            headerBorder.Child = headerGrid;
            Grid.SetRow(headerBorder, 0);
            contentGrid.Children.Add(headerBorder);

            // Content Area Views
            Grid viewsGrid = new Grid();
            viewsGrid.Margin = new Thickness(40);
            
            // Attendance View
            ViewAttendance = new Border();
            ViewAttendance.Background = Brushes.White;
            ViewAttendance.CornerRadius = new CornerRadius(16);
            ViewAttendance.Padding = new Thickness(40);
            ViewAttendance.VerticalAlignment = VerticalAlignment.Center;
            ViewAttendance.HorizontalAlignment = HorizontalAlignment.Center;
            ViewAttendance.Width = 600;
            ViewAttendance.Height = 450;
            DropShadowEffect attEffect = new DropShadowEffect();
            attEffect.Color = Colors.Black;
            attEffect.Opacity = 0.05;
            attEffect.BlurRadius = 20;
            attEffect.ShadowDepth = 4;
            ViewAttendance.Effect = attEffect;
            
            StackPanel attStack = new StackPanel();
            attStack.VerticalAlignment = VerticalAlignment.Center;
            attStack.HorizontalAlignment = HorizontalAlignment.Center;
            
            TxtScanMessage = new TextBlock();
            TxtScanMessage.Text = "Ready to Scan";
            TxtScanMessage.FontSize = 36;
            TxtScanMessage.FontWeight = FontWeights.Light;
            TxtScanMessage.HorizontalAlignment = HorizontalAlignment.Center;
            TxtScanMessage.Margin = new Thickness(0, 0, 0, 10);
            attStack.Children.Add(TxtScanMessage);

            TxtScanSubMessage = new TextBlock();
            TxtScanSubMessage.Text = "Place thumb on the sensor";
            TxtScanSubMessage.FontSize = 18;
            TxtScanSubMessage.Foreground = new SolidColorBrush(Color.FromRgb(102, 102, 102));
            TxtScanSubMessage.HorizontalAlignment = HorizontalAlignment.Center;
            TxtScanSubMessage.Margin = new Thickness(0, 0, 0, 20);
            attStack.Children.Add(TxtScanSubMessage);

            // Enrollment UI Elements
            TxtBigFingerprint = new TextBlock();
            TxtBigFingerprint.FontFamily = new FontFamily("Segoe MDL2 Assets");
            TxtBigFingerprint.Text = "\xE928";
            TxtBigFingerprint.FontSize = 100;
            TxtBigFingerprint.Foreground = new SolidColorBrush(Color.FromRgb(0, 120, 215));
            TxtBigFingerprint.HorizontalAlignment = HorizontalAlignment.Center;
            TxtBigFingerprint.Margin = new Thickness(0, 20, 0, 10);
            TxtBigFingerprint.Visibility = Visibility.Collapsed;
            attStack.Children.Add(TxtBigFingerprint);

            // Enrollment Progress Dots
            ProgressDots = new StackPanel();
            ProgressDots.Orientation = Orientation.Horizontal;
            ProgressDots.HorizontalAlignment = HorizontalAlignment.Center;
            ProgressDots.Margin = new Thickness(0, 20, 0, 0);
            ProgressDots.Visibility = Visibility.Collapsed;
            
            DotElements = new Border[4];
            for (int i = 0; i < 4; i++)
            {
                DotElements[i] = new Border();
                DotElements[i].Width = 12;
                DotElements[i].Height = 12;
                DotElements[i].CornerRadius = new CornerRadius(6);
                DotElements[i].Background = new SolidColorBrush(Color.FromRgb(226, 232, 240));
                DotElements[i].Margin = new Thickness(8, 0, 8, 0);
                ProgressDots.Children.Add(DotElements[i]);
            }
            attStack.Children.Add(ProgressDots);

            Button btnPin = new Button();
            btnPin.Content = "Scanner Failed? Use PIN";
            btnPin.Visibility = Visibility.Collapsed; // Hidden per request
            btnPin.Background = Brushes.White;
            btnPin.Foreground = new SolidColorBrush(Color.FromRgb(0, 120, 215));
            btnPin.FontWeight = FontWeights.SemiBold;
            btnPin.FontSize = 14;
            btnPin.Padding = new Thickness(20, 12, 20, 12);
            btnPin.BorderBrush = new SolidColorBrush(Color.FromRgb(221, 221, 221));
            btnPin.BorderThickness = new Thickness(1);
            btnPin.HorizontalAlignment = HorizontalAlignment.Center;
            btnPin.Cursor = System.Windows.Input.Cursors.Hand;
            btnPin.Click += (s, e) => {
                PinGrid.Visibility = Visibility.Visible;
                TxtPin.Clear();
                TxtPin.Focus();
            };
            attStack.Children.Add(btnPin);
            ViewAttendance.Child = attStack;

            // Enrollment View
            ViewEnrollment = new Border();
            ViewEnrollment.Background = Brushes.White;
            ViewEnrollment.CornerRadius = new CornerRadius(16);
            ViewEnrollment.Padding = new Thickness(40);
            ViewEnrollment.Visibility = Visibility.Collapsed;
            ViewEnrollment.Effect = attEffect;
            
            StackPanel enrStack = new StackPanel();
            TextBlock enrTitle = new TextBlock();
            enrTitle.Text = "Staff Enrollment";
            enrTitle.FontSize = 28;
            enrTitle.FontWeight = FontWeights.SemiBold;
            enrTitle.Margin = new Thickness(0, 0, 0, 10);
            enrStack.Children.Add(enrTitle);

            TextBlock enrSub = new TextBlock();
            enrSub.Text = "Search and manage biometric registration";
            enrSub.FontSize = 16;
            enrSub.Foreground = new SolidColorBrush(Color.FromRgb(102, 102, 102));
            enrSub.Margin = new Thickness(0, 0, 0, 15);
            enrStack.Children.Add(enrSub);

            Grid searchGrid = new Grid();
            searchGrid.Margin = new Thickness(0, 0, 0, 20);
            searchGrid.ColumnDefinitions.Add(new ColumnDefinition() { Width = new GridLength(1, GridUnitType.Star) });
            searchGrid.ColumnDefinitions.Add(new ColumnDefinition() { Width = GridLength.Auto });

            TextBox txtSearch = new TextBox();
            txtSearch.Padding = new Thickness(10);
            txtSearch.Margin = new Thickness(0, 0, 10, 0);
            txtSearch.FontSize = 14;
            txtSearch.Text = "Search staff by name, ID, or department...";
            txtSearch.Foreground = Brushes.Gray;
            txtSearch.GotFocus += (s, e) => { if (txtSearch.Text == "Search staff by name, ID, or department...") { txtSearch.Text = ""; txtSearch.Foreground = Brushes.Black; } };
            txtSearch.LostFocus += (s, e) => { if (string.IsNullOrWhiteSpace(txtSearch.Text)) { txtSearch.Text = "Search staff by name, ID, or department..."; txtSearch.Foreground = Brushes.Gray; } };
            
            txtSearch.TextChanged += (s, e) => {
                string query = txtSearch.Text.ToLower();
                if (query == "search staff by name, id, or department...") return;
                
                if (string.IsNullOrWhiteSpace(query)) {
                    LstStaff.ItemsSource = _staffCache;
                } else {
                    var filtered = _staffCache.Where(staff => 
                        (staff.name != null && staff.name.ToLower().Contains(query)) || 
                        (staff.personnel_number != null && staff.personnel_number.ToLower().Contains(query)) ||
                        (staff.department != null && staff.department.ToLower().Contains(query))
                    ).ToList();
                    LstStaff.ItemsSource = filtered;
                }
            };
            Grid.SetColumn(txtSearch, 0);
            searchGrid.Children.Add(txtSearch);

            Button btnRefresh = new Button();
            btnRefresh.Content = "Refresh List";
            btnRefresh.Padding = new Thickness(20, 10, 20, 10);
            btnRefresh.Background = new SolidColorBrush(Color.FromRgb(226, 232, 240));
            btnRefresh.Foreground = Brushes.Black;
            btnRefresh.BorderThickness = new Thickness(0);
            btnRefresh.Cursor = System.Windows.Input.Cursors.Hand;
            btnRefresh.Click += (s, e) => {
                SyncTimer_Tick(null, null);
                MessageBox.Show("Staff list is being refreshed from ERP in the background.", "Refresh Requested", MessageBoxButton.OK, MessageBoxImage.Information);
            };
            Grid.SetColumn(btnRefresh, 1);
            searchGrid.Children.Add(btnRefresh);

            enrStack.Children.Add(searchGrid);

            // Modern Card-based Enrollment List (Vertical)
            LstStaff = new ListBox();
            LstStaff.Height = 450;
            LstStaff.BorderThickness = new Thickness(0);
            LstStaff.Background = Brushes.Transparent;
            LstStaff.HorizontalContentAlignment = HorizontalAlignment.Stretch;
            ScrollViewer.SetVerticalScrollBarVisibility(LstStaff, ScrollBarVisibility.Auto);
            
            // Enable high-performance UI virtualization to prevent app freezes with large datasets
            VirtualizingStackPanel.SetIsVirtualizing(LstStaff, true);
            VirtualizingStackPanel.SetVirtualizationMode(LstStaff, VirtualizationMode.Recycling);
            ScrollViewer.SetCanContentScroll(LstStaff, true);
            
            // Card Template
            DataTemplate cardTemplate = new DataTemplate(typeof(StaffRecord));
            FrameworkElementFactory cardBorder = new FrameworkElementFactory(typeof(Border));
            cardBorder.SetValue(Border.BackgroundProperty, Brushes.White);
            cardBorder.SetValue(Border.CornerRadiusProperty, new CornerRadius(3)); // Almost sharp but not too sharp
            cardBorder.SetValue(Border.MarginProperty, new Thickness(0, 2, 10, 2)); 
            cardBorder.SetValue(Border.PaddingProperty, new Thickness(12));
            
            DropShadowEffect cardShadow = new DropShadowEffect();
            cardShadow.BlurRadius = 5;
            cardShadow.Opacity = 0.05;
            cardShadow.ShadowDepth = 1;
            cardBorder.SetValue(Border.EffectProperty, cardShadow);

            FrameworkElementFactory cardHorizontal = new FrameworkElementFactory(typeof(StackPanel));
            cardHorizontal.SetValue(StackPanel.OrientationProperty, Orientation.Horizontal);

            // Avatar
            FrameworkElementFactory avatarBorder = new FrameworkElementFactory(typeof(Border));
            avatarBorder.SetValue(Border.WidthProperty, 40.0);
            avatarBorder.SetValue(Border.HeightProperty, 40.0);
            avatarBorder.SetValue(Border.BackgroundProperty, new SolidColorBrush(Color.FromRgb(240, 244, 248)));
            avatarBorder.SetValue(Border.CornerRadiusProperty, new CornerRadius(20));
            avatarBorder.SetValue(Border.VerticalAlignmentProperty, VerticalAlignment.Center);
            
            FrameworkElementFactory avatarText = new FrameworkElementFactory(typeof(TextBlock));
            avatarText.SetBinding(TextBlock.TextProperty, new Binding("name") { Converter = new NameToInitialConverter() });
            avatarText.SetValue(TextBlock.HorizontalAlignmentProperty, HorizontalAlignment.Center);
            avatarText.SetValue(TextBlock.VerticalAlignmentProperty, VerticalAlignment.Center);
            avatarText.SetValue(TextBlock.FontSizeProperty, 14.0);
            avatarText.SetValue(TextBlock.FontWeightProperty, FontWeights.Bold);
            avatarText.SetValue(TextBlock.ForegroundProperty, new SolidColorBrush(Color.FromRgb(0, 120, 215)));
            avatarBorder.AppendChild(avatarText);
            cardHorizontal.AppendChild(avatarBorder);

            // Info Stack
            FrameworkElementFactory infoStack = new FrameworkElementFactory(typeof(StackPanel));
            infoStack.SetValue(StackPanel.VerticalAlignmentProperty, VerticalAlignment.Center);
            infoStack.SetValue(StackPanel.MarginProperty, new Thickness(15, 0, 0, 0));
            infoStack.SetValue(StackPanel.WidthProperty, 350.0);

            FrameworkElementFactory nameText = new FrameworkElementFactory(typeof(TextBlock));
            nameText.SetBinding(TextBlock.TextProperty, new Binding("name"));
            nameText.SetValue(TextBlock.FontWeightProperty, FontWeights.SemiBold);
            nameText.SetValue(TextBlock.FontSizeProperty, 15.0);
            nameText.SetValue(TextBlock.TextTrimmingProperty, TextTrimming.CharacterEllipsis);
            infoStack.AppendChild(nameText);

            FrameworkElementFactory idText = new FrameworkElementFactory(typeof(TextBlock));
            idText.SetBinding(TextBlock.TextProperty, new Binding("personnel_number"));
            idText.SetValue(TextBlock.FontSizeProperty, 11.0);
            idText.SetValue(TextBlock.ForegroundProperty, new SolidColorBrush(Color.FromRgb(100, 116, 139)));
            infoStack.AppendChild(idText);

            cardHorizontal.AppendChild(infoStack);

            // Status Indicator & Action
            FrameworkElementFactory actionStack = new FrameworkElementFactory(typeof(StackPanel));
            actionStack.SetValue(StackPanel.OrientationProperty, Orientation.Horizontal);
            actionStack.SetValue(StackPanel.HorizontalAlignmentProperty, HorizontalAlignment.Right);
            actionStack.SetValue(StackPanel.VerticalAlignmentProperty, VerticalAlignment.Center);
            
            // Badge
            FrameworkElementFactory badgeBorder = new FrameworkElementFactory(typeof(Border));
            badgeBorder.SetValue(Border.PaddingProperty, new Thickness(8, 4, 8, 4));
            badgeBorder.SetValue(Border.CornerRadiusProperty, new CornerRadius(4));
            badgeBorder.SetValue(Border.MarginProperty, new Thickness(0, 0, 10, 0));
            
            FrameworkElementFactory badgeText = new FrameworkElementFactory(typeof(TextBlock));
            badgeText.SetValue(TextBlock.FontSizeProperty, 10.0);
            badgeText.SetValue(TextBlock.FontWeightProperty, FontWeights.Bold);
            
            // Binding logic for badge color and text
            Binding statusBinding = new Binding("template_b64");
            statusBinding.Converter = new EnrollmentStatusConverter();
            badgeText.SetBinding(TextBlock.TextProperty, statusBinding);
            
            Binding colorBinding = new Binding("template_b64");
            colorBinding.Converter = new EnrollmentColorConverter();
            badgeBorder.SetBinding(Border.BackgroundProperty, colorBinding);
            badgeText.SetValue(TextBlock.ForegroundProperty, Brushes.White);
            
            badgeBorder.AppendChild(badgeText);
            actionStack.AppendChild(badgeBorder);

            // Enroll Button
            FrameworkElementFactory enrollBtn = new FrameworkElementFactory(typeof(Button));
            enrollBtn.SetValue(Button.ContentProperty, "Enroll");
            enrollBtn.SetValue(Button.PaddingProperty, new Thickness(12, 6, 12, 6));
            enrollBtn.SetValue(Button.BackgroundProperty, new SolidColorBrush(Color.FromRgb(0, 120, 215)));
            enrollBtn.SetValue(Button.ForegroundProperty, Brushes.White);
            enrollBtn.SetValue(Button.BorderThicknessProperty, new Thickness(0));
            
            // Hide if enrolled
            Binding btnVisBinding = new Binding("template_b64");
            btnVisBinding.Converter = new EnrollmentVisibilityConverter();
            enrollBtn.SetBinding(Button.VisibilityProperty, btnVisBinding);
            
            enrollBtn.AddHandler(Button.ClickEvent, new RoutedEventHandler((s, e) => {
                Button b = s as Button;
                StaffRecord staff = b.DataContext as StaffRecord;
                if (staff != null) {
                    _currentEnrollingStaff = staff;
                    TxtEnrollmentPinInput.Text = "";
                    EnrollmentPinGrid.Visibility = Visibility.Visible;
                    TxtEnrollmentPinInput.Focus();
                }
            }));
            
            actionStack.AppendChild(enrollBtn);
            cardHorizontal.AppendChild(actionStack);

            cardBorder.AppendChild(cardHorizontal);
            cardTemplate.VisualTree = cardBorder;
            LstStaff.ItemTemplate = cardTemplate;
            
            LstStaff.ItemsSource = _staffCache;
            enrStack.Children.Add(LstStaff);

            ViewEnrollment.Child = enrStack;

            // Enrollment PIN Overlay
            EnrollmentPinGrid = new Grid();
            EnrollmentPinGrid.Background = new SolidColorBrush(Color.FromArgb(200, 0, 0, 0));
            EnrollmentPinGrid.Visibility = Visibility.Collapsed;
            
            Border enPinBorder = new Border();
            enPinBorder.Background = Brushes.White;
            enPinBorder.Padding = new Thickness(40);
            enPinBorder.Width = 350;
            enPinBorder.VerticalAlignment = VerticalAlignment.Center;
            enPinBorder.HorizontalAlignment = HorizontalAlignment.Center;
            enPinBorder.CornerRadius = new CornerRadius(8);

            StackPanel enPinStack = new StackPanel();
            
            enPinStack.Children.Add(new TextBlock { 
                Text = "Step 1: Set Staff PIN", 
                FontSize = 20, 
                FontWeight = FontWeights.Bold,
                Margin = new Thickness(0, 0, 0, 10)
            });
            enPinStack.Children.Add(new TextBlock { 
                Text = "Enter a numeric security PIN for this staff member.",
                TextWrapping = TextWrapping.Wrap,
                Margin = new Thickness(0, 0, 0, 20),
                Foreground = Brushes.Gray
            });
            
            TxtEnrollmentPinInput = new TextBox();
            TxtEnrollmentPinInput.Padding = new Thickness(15);
            TxtEnrollmentPinInput.FontSize = 18;
            TxtEnrollmentPinInput.Margin = new Thickness(0, 0, 0, 20);
            enPinStack.Children.Add(TxtEnrollmentPinInput);
            
            Button btnContinueEnroll = new Button();
            btnContinueEnroll.Content = "Continue to Fingerprint";
            btnContinueEnroll.Padding = new Thickness(15);
            btnContinueEnroll.Background = new SolidColorBrush(Color.FromRgb(0, 120, 215));
            btnContinueEnroll.Foreground = Brushes.White;
            btnContinueEnroll.Click += (s, e) => {
                if (TxtEnrollmentPinInput.Text.Length >= 4) {
                    _tempEnrollPin = TxtEnrollmentPinInput.Text;
                    EnrollmentPinGrid.Visibility = Visibility.Collapsed;
                    
                    // Start actual scanning
                    _mode = "enroll";
                    _enrollingStaffId = _currentEnrollingStaff.id;
                    _primaryTemplateB64 = "";
                    if (_driverExists) { _enrollment = new Enrollment(); }
                    _enrollmentSuccessCount = 0;
                    _enrollmentMismatchCount = 0;
                    SetStatusMessage("Enrolling: " + _currentEnrollingStaff.name, "Place LEFT finger on scanner (Scan 1/4)", Colors.Blue);
                    ProgressDots.Visibility = Visibility.Visible;
                    TxtBigFingerprint.Visibility = Visibility.Visible;
                    foreach (var dot in DotElements) dot.Background = new SolidColorBrush(Color.FromRgb(226, 232, 240));
                    ViewEnrollment.Visibility = Visibility.Collapsed;
                    ViewAttendance.Visibility = Visibility.Visible;
                } else {
                    MessageBox.Show("PIN must be at least 4 digits.");
                }
            };
            enPinStack.Children.Add(btnContinueEnroll);
            
            Button btnCancelEnrollPin = new Button();
            btnCancelEnrollPin.Content = "Cancel";
            btnCancelEnrollPin.Background = Brushes.Transparent;
            btnCancelEnrollPin.Margin = new Thickness(0, 10, 0, 0);
            btnCancelEnrollPin.Click += (s, e) => EnrollmentPinGrid.Visibility = Visibility.Collapsed;
            enPinStack.Children.Add(btnCancelEnrollPin);
            
            enPinBorder.Child = enPinStack;
            EnrollmentPinGrid.Children.Add(enPinBorder);
            // Moved to end of BuildUI for correct Z-Order

            viewsGrid.Children.Add(ViewAttendance);
            viewsGrid.Children.Add(ViewEnrollment);
            Grid.SetRow(viewsGrid, 1);
            contentGrid.Children.Add(viewsGrid);
            
            // Blocker Overlay
            BlockerGrid = new Grid();
            BlockerGrid.Background = new SolidColorBrush(Color.FromRgb(242, 242, 242));
            BlockerGrid.Visibility = Visibility.Collapsed;
            
            StackPanel blockerStack = new StackPanel();
            blockerStack.HorizontalAlignment = HorizontalAlignment.Center;
            blockerStack.VerticalAlignment = VerticalAlignment.Center;
            
            BlockerTitle = new TextBlock();
            BlockerTitle.Text = "Terminal Registration";
            BlockerTitle.FontSize = 36;
            BlockerTitle.FontWeight = FontWeights.Bold;
            BlockerTitle.Margin = new Thickness(0, 0, 0, 10);
            BlockerTitle.HorizontalAlignment = HorizontalAlignment.Center;
            blockerStack.Children.Add(BlockerTitle);
            
            BlockerStatus = new TextBlock();
            BlockerStatus.Text = "Terminal ID: " + _config.TERMINAL_ID + "\nWaiting for administrator approval...";
            BlockerStatus.FontSize = 18;
            BlockerStatus.Foreground = new SolidColorBrush(Color.FromRgb(100, 116, 139));
            BlockerStatus.TextAlignment = TextAlignment.Center;
            BlockerStatus.Margin = new Thickness(0, 0, 0, 30);
            blockerStack.Children.Add(BlockerStatus);

            Button btnShowSettings = new Button();
            btnShowSettings.Content = "Configure ERP Server";
            btnShowSettings.Padding = new Thickness(20, 10, 20, 10);
            btnShowSettings.Click += (s, e) => SettingsGrid.Visibility = Visibility.Visible;
            blockerStack.Children.Add(btnShowSettings);
            
            BlockerGrid.Children.Add(blockerStack);
            rootGrid.Children.Add(BlockerGrid);

            // PIN Overlay
            PinGrid = new Grid();
            PinGrid.Background = new SolidColorBrush(Color.FromArgb(200, 0, 0, 0));
            PinGrid.Visibility = Visibility.Collapsed;
            
            Border pinBorder = new Border();
            pinBorder.Background = Brushes.White;
            pinBorder.CornerRadius = new CornerRadius(16);
            pinBorder.Padding = new Thickness(40);
            pinBorder.Width = 400;
            pinBorder.VerticalAlignment = VerticalAlignment.Center;
            
            StackPanel pinStack = new StackPanel();
            TextBlock pinTitle = new TextBlock();
            pinTitle.Text = "Staff Authentication";
            pinTitle.FontSize = 24;
            pinTitle.FontWeight = FontWeights.Bold;
            pinTitle.Margin = new Thickness(0, 0, 0, 10);
            pinStack.Children.Add(pinTitle);

            TextBlock pinSub = new TextBlock();
            pinSub.Text = "Enter Employee ID and PIN";
            pinSub.Margin = new Thickness(0, 0, 0, 20);
            pinStack.Children.Add(pinSub);

            TextBlock lblEid = new TextBlock();
            lblEid.Text = "Employee ID (e.g. EMP-001)";
            lblEid.FontSize = 12;
            lblEid.Margin = new Thickness(0, 0, 0, 5);
            pinStack.Children.Add(lblEid);

            TextBox txtEid = new TextBox();
            txtEid.Padding = new Thickness(10);
            txtEid.Margin = new Thickness(0, 0, 0, 15);
            pinStack.Children.Add(txtEid);

            TextBlock lblPin = new TextBlock();
            lblPin.Text = "PIN Code";
            lblPin.FontSize = 12;
            lblPin.Margin = new Thickness(0, 0, 0, 5);
            pinStack.Children.Add(lblPin);

            TxtPin = new TextBox(); // PasswordBox would be better but let's stick to simplicity for now
            TxtPin.Padding = new Thickness(10);
            TxtPin.Margin = new Thickness(0, 0, 0, 25);
            pinStack.Children.Add(TxtPin);

            Button btnVerifyPin = new Button();
            btnVerifyPin.Content = "Authenticate";
            btnVerifyPin.Padding = new Thickness(15);
            btnVerifyPin.Background = new SolidColorBrush(Color.FromRgb(0, 120, 215));
            btnVerifyPin.Foreground = Brushes.White;
            btnVerifyPin.FontWeight = FontWeights.Bold;
            btnVerifyPin.Click += (s, e) => {
                VerifyPin(txtEid.Text, TxtPin.Text);
            };
            pinStack.Children.Add(btnVerifyPin);

            Button btnCancelPin = new Button();
            btnCancelPin.Content = "Cancel";
            btnCancelPin.Margin = new Thickness(0, 10, 0, 0);
            btnCancelPin.Background = Brushes.Transparent;
            btnCancelPin.BorderThickness = new Thickness(0);
            btnCancelPin.Click += (s, e) => PinGrid.Visibility = Visibility.Collapsed;
            pinStack.Children.Add(btnCancelPin);

            pinBorder.Child = pinStack;
            PinGrid.Children.Add(pinBorder);
            rootGrid.Children.Add(PinGrid);

            // Settings Dialog
            SettingsGrid = new Grid();
            SettingsGrid.Background = new SolidColorBrush(Color.FromArgb(180, 0, 0, 0));
            SettingsGrid.Visibility = Visibility.Collapsed;
            
            Border settingsBorder = new Border();
            settingsBorder.Background = Brushes.White;
            settingsBorder.CornerRadius = new CornerRadius(10);
            settingsBorder.Padding = new Thickness(30);
            settingsBorder.Width = 450;
            settingsBorder.VerticalAlignment = VerticalAlignment.Center;
            
            StackPanel settingsStack = new StackPanel();
            TextBlock settingsTitle = new TextBlock();
            settingsTitle.Text = "ERP Server Configuration";
            settingsTitle.FontSize = 24;
            settingsTitle.FontWeight = FontWeights.Bold;
            settingsTitle.Margin = new Thickness(0, 0, 0, 20);
            settingsStack.Children.Add(settingsTitle);
            
            TextBlock lblUrl = new TextBlock();
            lblUrl.Text = "Server URL (e.g. http://192.168.1.13:8000)";
            lblUrl.Margin = new Thickness(0, 0, 0, 5);
            settingsStack.Children.Add(lblUrl);
            
            TxtErpUrl = new TextBox();
            TxtErpUrl.Padding = new Thickness(10);
            TxtErpUrl.Margin = new Thickness(0, 0, 0, 20);
            if (_config.ERP_ENDPOINTS != null && _config.ERP_ENDPOINTS.Length > 0)
                TxtErpUrl.Text = _config.ERP_ENDPOINTS[0];
            settingsStack.Children.Add(TxtErpUrl);
            
            StackPanel settingsBtns = new StackPanel();
            settingsBtns.Orientation = Orientation.Horizontal;
            settingsBtns.HorizontalAlignment = HorizontalAlignment.Right;
            
            Button btnSave = new Button();
            btnSave.Content = "Save & Restart Sync";
            btnSave.Padding = new Thickness(15, 8, 15, 8);
            btnSave.Background = new SolidColorBrush(Color.FromRgb(0, 120, 215));
            btnSave.Foreground = Brushes.White;
            btnSave.Click += (s, e) => {
                if (!string.IsNullOrEmpty(TxtErpUrl.Text)) {
                    _config.ERP_ENDPOINTS = new string[] { TxtErpUrl.Text.Trim() };
                    _config.Save();
                    SettingsGrid.Visibility = Visibility.Collapsed;
                }
            };
            settingsBtns.Children.Add(btnSave);
            
            Button btnViewLogs = new Button();
            btnViewLogs.Content = "View Logs";
            btnViewLogs.Margin = new Thickness(10, 0, 0, 0);
            btnViewLogs.Padding = new Thickness(15, 8, 15, 8);
            btnViewLogs.Background = new SolidColorBrush(Color.FromRgb(71, 85, 105));
            btnViewLogs.Foreground = Brushes.White;
            btnViewLogs.Click += (s, e) => {
                try {
                    string dir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "Proxima-Kiosk");
                    string logPath = Path.Combine(dir, "kiosk_debug.log");
                    if (!File.Exists(logPath)) {
                        File.WriteAllText(logPath, "[System] Logging session started.\n");
                    }
                    System.Diagnostics.Process.Start("notepad.exe", logPath);
                } catch (Exception ex) {
                    MessageBox.Show("Unable to open log file: " + ex.Message);
                }
            };
            settingsBtns.Children.Add(btnViewLogs);

            Button btnCancel = new Button();
            btnCancel.Content = "Cancel";
            btnCancel.Margin = new Thickness(10, 0, 0, 0);
            btnCancel.Padding = new Thickness(15, 8, 15, 8);
            btnCancel.Click += (s, e) => SettingsGrid.Visibility = Visibility.Collapsed;
            settingsBtns.Children.Add(btnCancel);
            
            settingsStack.Children.Add(settingsBtns);
            settingsBorder.Child = settingsStack;
            SettingsGrid.Children.Add(settingsBorder);
            rootGrid.Children.Add(SettingsGrid);

            // Profile Overlay (The ID Card)
            ProfileOverlayGrid = new Grid();
            ProfileOverlayGrid.Background = new SolidColorBrush(Color.FromArgb(180, 0, 0, 0));
            ProfileOverlayGrid.Visibility = Visibility.Collapsed;
            
            ProfileCardBorder = new Border();
            ProfileCardBorder.Width = 800;
            ProfileCardBorder.Height = 350;
            ProfileCardBorder.Background = Brushes.White;
            ProfileCardBorder.CornerRadius = new CornerRadius(20);
            ProfileCardBorder.VerticalAlignment = VerticalAlignment.Center;
            ProfileCardBorder.HorizontalAlignment = HorizontalAlignment.Center;
            
            Grid profileCardGrid = new Grid();
            profileCardGrid.ColumnDefinitions.Add(new ColumnDefinition() { Width = new GridLength(300) });
            profileCardGrid.ColumnDefinitions.Add(new ColumnDefinition() { Width = new GridLength(1, GridUnitType.Star) });
            
            // Photo Section
            Border profilePhotoBorder = new Border();
            profilePhotoBorder.Background = new SolidColorBrush(Color.FromRgb(240, 240, 240));
            profilePhotoBorder.CornerRadius = new CornerRadius(20, 0, 0, 20);
            ProfilePhoto = new Image();
            ProfilePhoto.Stretch = Stretch.UniformToFill;
            profilePhotoBorder.Child = ProfilePhoto;
            Grid.SetColumn(profilePhotoBorder, 0);
            profileCardGrid.Children.Add(profilePhotoBorder);
            
            // Info Section
            StackPanel profileInfoStack = new StackPanel();
            profileInfoStack.Margin = new Thickness(40);
            
            ProfileName = new TextBlock();
            ProfileName.FontSize = 32;
            ProfileName.FontWeight = FontWeights.Bold;
            ProfileName.Margin = new Thickness(0, 0, 0, 5);
            profileInfoStack.Children.Add(ProfileName);
            
            ProfileRole = new TextBlock();
            ProfileRole.FontSize = 18;
            ProfileRole.Foreground = Brushes.Gray;
            ProfileRole.Margin = new Thickness(0, 0, 0, 20);
            profileInfoStack.Children.Add(ProfileRole);
            
            Grid profileDetailsGrid = new Grid();
            profileDetailsGrid.ColumnDefinitions.Add(new ColumnDefinition());
            profileDetailsGrid.ColumnDefinitions.Add(new ColumnDefinition());
            
            StackPanel profileDetCol1 = new StackPanel();
            TextBlock lblDept = new TextBlock() { Text = "DEPARTMENT", FontSize = 12, Foreground = Brushes.Gray, FontWeight = FontWeights.Bold };
            ProfileDept = new TextBlock() { FontSize = 16, FontWeight = FontWeights.SemiBold, Margin = new Thickness(0, 5, 0, 15) };
            profileDetCol1.Children.Add(lblDept);
            profileDetCol1.Children.Add(ProfileDept);
            
            TextBlock lblId = new TextBlock() { Text = "EMPLOYEE ID", FontSize = 12, Foreground = Brushes.Gray, FontWeight = FontWeights.Bold };
            ProfileId = new TextBlock() { FontSize = 16, FontWeight = FontWeights.SemiBold };
            profileDetCol1.Children.Add(lblId);
            profileDetCol1.Children.Add(ProfileId);
            Grid.SetColumn(profileDetCol1, 0);
            profileDetailsGrid.Children.Add(profileDetCol1);
            
            StackPanel profileDetCol2 = new StackPanel();
            TextBlock lblBranch = new TextBlock() { Text = "BRANCH", FontSize = 12, Foreground = Brushes.Gray, FontWeight = FontWeights.Bold };
            ProfileBranch = new TextBlock() { FontSize = 16, FontWeight = FontWeights.SemiBold, Margin = new Thickness(0, 5, 0, 15) };
            profileDetCol2.Children.Add(lblBranch);
            profileDetCol2.Children.Add(ProfileBranch);
            
            TextBlock lblTime = new TextBlock() { Text = "RECORDED AT", FontSize = 12, Foreground = Brushes.Gray, FontWeight = FontWeights.Bold };
            ProfileTime = new TextBlock() { FontSize = 16, FontWeight = FontWeights.SemiBold };
            profileDetCol2.Children.Add(lblTime);
            profileDetCol2.Children.Add(ProfileTime);
            Grid.SetColumn(profileDetCol2, 1);
            profileDetailsGrid.Children.Add(profileDetCol2);
            
            profileInfoStack.Children.Add(profileDetailsGrid);
            
            ProfileStatusBadge = new TextBlock();
            ProfileStatusBadge.Text = "MATCHED";
            ProfileStatusBadge.Foreground = Brushes.White;
            ProfileStatusBadge.Background = Brushes.Green;
            ProfileStatusBadge.Padding = new Thickness(10, 5, 10, 5);
            ProfileStatusBadge.HorizontalAlignment = HorizontalAlignment.Right;
            ProfileStatusBadge.Margin = new Thickness(0, 20, 0, 0);
            profileInfoStack.Children.Add(ProfileStatusBadge);
            
            Grid.SetColumn(profileInfoStack, 1);
            profileCardGrid.Children.Add(profileInfoStack);
            
            ProfileCardBorder.Child = profileCardGrid;
            ProfileOverlayGrid.Children.Add(ProfileCardBorder);
            rootGrid.Children.Add(ProfileOverlayGrid);

            // Add Enrollment PIN last to ensure it's on top
            if (EnrollmentPinGrid.Parent != null) ((Grid)EnrollmentPinGrid.Parent).Children.Remove(EnrollmentPinGrid);
            rootGrid.Children.Add(EnrollmentPinGrid);
        }

        private void VerifyPin(string personnelNumber, string pin)
        {
            if (string.IsNullOrEmpty(personnelNumber) || string.IsNullOrEmpty(pin))
            {
                MessageBox.Show("Please enter both Employee ID and PIN.");
                return;
            }

            var staff = _staffCache.FirstOrDefault(s => s.personnel_number == personnelNumber);
            if (staff != null && _db.HasCheckedInToday(staff.id))
            {
                MessageBox.Show("Already checked in today.");
                ResetWaiting();
                PinGrid.Visibility = Visibility.Collapsed;
                return;
            }

            SetStatusMessage("Verifying PIN...", "Connecting to server", Colors.Blue);
            
            System.Threading.Thread thread = new System.Threading.Thread(new System.Threading.ThreadStart(delegate()
            {
                Dictionary<string, object> payload = new Dictionary<string, object>();
                payload.Add("personnel_number", personnelNumber);
                payload.Add("pin", pin);
                payload.Add("source", "PIN");
                payload.Add("latitude", _latitude);
                payload.Add("longitude", _longitude);

                string response = _api.Post("/api/v1/kiosk/verify-pin", payload);
                
                Dispatcher.Invoke(new Action(delegate()
                {
                    if (!string.IsNullOrEmpty(response))
                    {
                        try {
                            JavaScriptSerializer json = new JavaScriptSerializer();
                            Dictionary<string, object> res = json.Deserialize<Dictionary<string, object>>(response);
                            if (res.ContainsKey("success") && (bool)res["success"])
                            {
                                string staffId = res["staff_id"].ToString();
                                string name = (string)res["name"];
                                string type = (string)res["type"];
                                string msg = (string)res["message"];
                                bool isLate = res.ContainsKey("is_late") ? Convert.ToBoolean(res["is_late"]) : false;
                                int minutesLate = res.ContainsKey("minutes_late") ? Convert.ToInt32(res["minutes_late"]) : 0;

                                SetStatusMessage(type, msg, Colors.Green);
                                _db.AddAttendance(staffId, type);
                                
                                // Reset and show full profile card instead of hiding silently
                                PinGrid.Visibility = Visibility.Collapsed;
                                ShowProfileCard(_staffCache.FirstOrDefault(s => s.id == staffId), type, msg, isLate, minutesLate);
                            }
                            else
                            {
                                string msg = res.ContainsKey("message") ? (string)res["message"] : "Invalid credentials";
                                MessageBox.Show(msg);
                                SetStatusMessage("Auth Failed", msg, Colors.Red);
                                ResetWaiting();
                            }
                        } catch { 
                            MessageBox.Show("Server communication error.");
                            ResetWaiting();
                        }
                    }
                    else
                    {
                        MessageBox.Show("Server unreachable. Offline PIN verification not supported.");
                        ResetWaiting();
                    }
                }));
            }));
            thread.IsBackground = true;
            thread.Start();
        }

        private void MainWindow_Loaded(object sender, RoutedEventArgs e)
        {
            System.Net.WebRequest.DefaultWebProxy = null;
            Log("MainWindow_Loaded: Start");
            
            // Async fetch location
            System.Threading.Thread locThread = new System.Threading.Thread(new System.Threading.ThreadStart(delegate() {
                try {
                    using (WebClient wc = new WebClient()) {
                        string json = wc.DownloadString("http://ip-api.com/json/");
                        JavaScriptSerializer js = new JavaScriptSerializer();
                        Dictionary<string, object> res = js.Deserialize<Dictionary<string, object>>(json);
                        if (res.ContainsKey("lat") && res.ContainsKey("lon")) {
                            _latitude = Convert.ToDouble(res["lat"]);
                            _longitude = Convert.ToDouble(res["lon"]);
                            Log(string.Format("Location identified via IP: {0}, {1}", _latitude, _longitude));
                        }
                    }
                } catch { Log("Location tracking failed, will send nulls."); }
            }));
            locThread.IsBackground = true;
            locThread.Start();

            try {
                _staffCache = _db.LoadStaff();
                RefreshTemplateCache();
                if (LstStaff != null) LstStaff.ItemsSource = _staffCache;
                Log("MainWindow_Loaded: Staff loaded: " + _staffCache.Count);
            } catch (Exception ex) {
                Log("MainWindow_Loaded Error: " + ex.Message);
            }
            
            if (!_config.IS_ACTIVATED)
            {
                BlockerGrid.Visibility = Visibility.Visible;
                BlockerStatus.Text = "Terminal ID: " + _config.TERMINAL_ID + "\nWaiting for administrator approval...";
            }
            else
            {
                BlockerGrid.Visibility = Visibility.Collapsed;
                InitScanner();
            }
            Log("MainWindow_Loaded: End");
        }

        private void MainWindow_Closed(object sender, EventArgs e)
        {
            if (_capturer != null)
            {
                _capturer.StopCapture();
            }
        }

        private void InitScanner()
        {
            try
            {
                _driverExists = false;
                try {
                    IntPtr hMod = LoadLibrary("DPFPApi.dll");
                    if (hMod != IntPtr.Zero) {
                        _driverExists = true;
                        FreeLibrary(hMod);
                    }
                } catch { }

                if (_driverExists)
                {
                    _capturer = new Capture();
                    _capturer.EventHandler = this;
                    _capturer.StartCapture();
                    SetStatusMessage("Ready to Scan", "Place thumb on the sensor", Colors.Black);
                }
                else
                {
                    SetStatusMessage("Scanner Offline", "Drivers not installed.", Colors.Red);
                    TxtScannerStatus.Text = "Scanner Offline";
                    TxtScannerStatus.Foreground = new SolidColorBrush(Colors.Red);
                }
            }
            catch (Exception ex)
            {
                SetStatusMessage("Scanner Offline", "Hardware disconnected or driver error.", Colors.Red);
                TxtScannerStatus.Text = "Scanner Error";
                TxtScannerStatus.Foreground = new SolidColorBrush(Colors.Red);
            }
        }

        // DPFP Event Handlers
        public void OnComplete(object capture, string readerSerialNumber, Sample sample)
        {
            if (_isProcessingScan) return;
            _isProcessingScan = true;
            try
            {
                long nowTs = (long)(DateTime.UtcNow - new DateTime(1970, 1, 1)).TotalSeconds;
                _latestScan = new { status = "PROCESSING", timestamp = nowTs };

            bool isWaitingForScan = false;
            Dispatcher.Invoke(new Action(delegate()
            {
                isWaitingForScan = (ViewAttendance.Visibility == Visibility.Visible || ViewEnrollment.Visibility == Visibility.Visible);
            }));

            if (!isWaitingForScan) return;

            Dispatcher.Invoke(new Action(delegate()
            {
                SetStatusMessage("Processing...", "Extracting fingerprint features...", Colors.Blue);
            }));

            FeatureExtraction extractor = new FeatureExtraction();
            CaptureFeedback feedback = CaptureFeedback.None;
            FeatureSet features = new FeatureSet();
            extractor.CreateFeatureSet(sample, DataPurpose.Verification, ref feedback, ref features);

            if (feedback == CaptureFeedback.Good)
            {
                // Duplicate Prevention & Verification (OUTSIDE UI Thread)
                StaffRecord matchedStaff = null;
                StaffRecord duplicateStaff = null;

                if (_mode == "attendance")
                {
                    foreach (var staff in _staffCache)
                    {
                        lock (_templateLock)
                        {
                            if (!_parsedTemplates.ContainsKey(staff.id)) continue;
                            foreach(var template in _parsedTemplates[staff.id])
                            {
                                try
                                {
                                    Verification.Result result = new Verification.Result();
                                    _verifier.Verify(features, template, ref result);
                                    if (result.Verified) { matchedStaff = staff; break; }
                                }
                                catch { }
                            }
                        }
                        if (matchedStaff != null) break;
                    }
                }
                else if (_mode == "enroll")
                {
                    // Check against ALL enrolled staff templates (skip the staff being enrolled)
                    foreach (var staff in _staffCache)
                    {
                        if (staff.id == _enrollingStaffId) continue; // Don't match against self
                        lock (_templateLock)
                        {
                            if (!_parsedTemplates.ContainsKey(staff.id)) continue;
                            foreach(var template in _parsedTemplates[staff.id])
                            {
                                try
                                {
                                    Verification.Result result = new Verification.Result();
                                    _verifier.Verify(features, template, ref result);
                                    if (result.Verified) { duplicateStaff = staff; break; }
                                }
                                catch { }
                            }
                        }
                        if (duplicateStaff != null) break;
                    }

                    // Cross-check: if enrolling second finger, verify it's not the same as the first finger
                    if (duplicateStaff == null && !string.IsNullOrEmpty(_primaryTemplateB64))
                    {
                        try
                        {
                            byte[] primaryBytes = Convert.FromBase64String(_primaryTemplateB64);
                            DPFP.Template primaryTemplate = new DPFP.Template();
                            using (MemoryStream ms = new MemoryStream(primaryBytes))
                            {
                                primaryTemplate.DeSerialize(ms);
                            }
                            Verification.Result crossResult = new Verification.Result();
                            _verifier.Verify(features, primaryTemplate, ref crossResult);
                            if (crossResult.Verified)
                            {
                                // Same finger as the left hand — treat as duplicate
                                duplicateStaff = new StaffRecord { name = "left finger (same hand)" };
                            }
                        }
                        catch (Exception exCross) { Log("Cross-check error: " + exCross.Message); }
                    }
                }

                Dispatcher.Invoke(new Action(delegate()
                {
                    if (_mode == "enroll" && duplicateStaff != null)
                    {
                        string dupMsg = duplicateStaff.name == "left finger (same hand)"
                            ? "Right finger must be different from left finger!"
                            : "Fingerprint belongs to " + duplicateStaff.name;
                        SetStatusMessage("Duplicate Found", dupMsg, Colors.Red);
                        // Only reset the current finger — if on second finger, keep _primaryTemplateB64
                        if (string.IsNullOrEmpty(_primaryTemplateB64))
                        {
                            // First finger duplicate — full reset
                            if (_driverExists) { _enrollment = new Enrollment(); }
                            _enrollmentSuccessCount = 0;
                            _enrollmentMismatchCount = 0;
                            foreach (var dot in DotElements) dot.Background = new SolidColorBrush(Color.FromRgb(226, 232, 240));
                        }
                        else
                        {
                            // Second finger duplicate — reset only the second finger enrollment
                            if (_driverExists) { _enrollment = new Enrollment(); }
                            _enrollmentSuccessCount = 0;
                            _enrollmentMismatchCount = 0;
                            foreach (var dot in DotElements) dot.Background = new SolidColorBrush(Color.FromRgb(226, 232, 240));
                            SetStatusMessage("Try Again", "Place a DIFFERENT finger for your right hand (Scan 1/4)", Colors.Orange);
                        }
                        return; // Stop processing further
                    }

                    if (_mode == "attendance")
                    {
                        if (matchedStaff != null)
                        {
                            _latestScan = new { 
                                status = "MATCHED", 
                                staff_id = matchedStaff.id, 
                                name = matchedStaff.name,
                                personnel_number = matchedStaff.personnel_number,
                                timestamp = nowTs,
                                message = "Identified locally"
                            };



                             // Check if already checked in today
                             if (_db.HasCheckedInToday(matchedStaff.id))
                             {
                                 // Already clocked in — check if eligible for Clock-Out
                                 bool canCheckOut = false;
                                 string checkOutMsg = "Already checked in today";
                                 if (!string.IsNullOrEmpty(matchedStaff.shift_end))
                                 {
                                     TimeSpan shiftEnd;
                                     if (TimeSpan.TryParse(matchedStaff.shift_end, out shiftEnd))
                                     {
                                         // Allow clock-out 30 minutes before shift_end
                                         DateTime checkOutAllowed = DateTime.Now.Date.Add(shiftEnd).AddMinutes(-30);
                                         if (DateTime.Now >= checkOutAllowed)
                                         {
                                             canCheckOut = true;
                                         }
                                         else
                                         {
                                             string allowedTime = checkOutAllowed.ToString("hh:mm tt");
                                             checkOutMsg = "Clock-out available from " + allowedTime;
                                         }
                                     }
                                 }

                                 if (canCheckOut && !_db.HasCheckedOutToday(matchedStaff.id))
                                 {
                                     // Check Cooldown
                                     if (_cooldowns.ContainsKey(matchedStaff.id))
                                     {
                                         double elapsed = (DateTime.Now - _cooldowns[matchedStaff.id]).TotalSeconds;
                                         if (elapsed < _config.COOLDOWN_SECONDS)
                                         {
                                             SetStatusMessage("Denied", "Scan too frequent. Please wait " + (int)(_config.COOLDOWN_SECONDS - elapsed) + "s", Colors.Red);
                                             goto EndScan;
                                         }
                                     }

                                     // Record Clock-Out
                                     _db.AddAttendance(matchedStaff.id, "Clock-Out");
                                     _cooldowns[matchedStaff.id] = DateTime.Now;
                                     SetStatusMessage("Clocked Out", matchedStaff.name, Colors.Green);
                                     ShowProfileCard(matchedStaff, "CLOCK_OUT", "Checked out successfully", false, 0);
                                     _latestScan = new { 
                                         status = "CLOCKED_OUT", 
                                         staff_id = matchedStaff.id, 
                                         name = matchedStaff.name,
                                         timestamp = nowTs
                                     };

                                     // Sync clock-out to ERP in background
                                     System.Threading.Thread coThread = new System.Threading.Thread(new System.Threading.ThreadStart(delegate()
                                     {
                                         try {
                                             Dictionary<string, object> verifyPayload = new Dictionary<string, object>();
                                             verifyPayload.Add("staff_id", matchedStaff.id);
                                             verifyPayload.Add("source", "BIOMETRIC");
                                             verifyPayload.Add("latitude", _latitude);
                                             verifyPayload.Add("longitude", _longitude);
                                             _api.Post("/api/v1/kiosk/verify", verifyPayload);
                                         } catch { }
                                     }));
                                     coThread.IsBackground = true;
                                     coThread.Start();
                                     goto EndScan;
                                 }
                                 else if (_db.HasCheckedOutToday(matchedStaff.id))
                                 {
                                     checkOutMsg = "Already clocked out today";
                                 }

                                 SetStatusMessage("Clocked In", matchedStaff.name, Colors.Orange);
                                 ShowProfileCard(matchedStaff, "CLOCKED_IN", checkOutMsg, false, 0);
                                 _latestScan = new { 
                                     status = "ALREADY_CLOCKED_IN", 
                                     staff_id = matchedStaff.id, 
                                     name = matchedStaff.name,
                                     timestamp = nowTs
                                 };
                                 goto EndScan;
                             }

                             // Check Cooldown before Clock-In
                             if (_cooldowns.ContainsKey(matchedStaff.id))
                             {
                                 double elapsed = (DateTime.Now - _cooldowns[matchedStaff.id]).TotalSeconds;
                                 if (elapsed < _config.COOLDOWN_SECONDS)
                                 {
                                     SetStatusMessage("Denied", "Scan too frequent. Please wait " + (int)(_config.COOLDOWN_SECONDS - elapsed) + "s", Colors.Red);
                                     goto EndScan;
                                 }
                             }

                             _db.AddAttendance(matchedStaff.id);
                             _cooldowns[matchedStaff.id] = DateTime.Now;

                            bool localIsLate = false;
                            int localMinutesLate = 0;
                            CalculateLateness(matchedStaff, out localIsLate, out localMinutesLate);
                            string localType = localIsLate ? "LATE" : "SUCCESS";
                            string localMsg = localIsLate ? "Checked in late" : "Checked in on time";

                            SetStatusMessage("Identified", matchedStaff.name, Colors.Green);
                            ShowProfileCard(matchedStaff, localType, localMsg, localIsLate, localMinutesLate);

                            _latestScan = new { 
                                status = "MATCHED", 
                                staff_id = matchedStaff.id, 
                                name = matchedStaff.name, 
                                type = localType,
                                message = localMsg,
                                timestamp = nowTs
                            };

                            // Sync to ERP in the background (completely silent & non-blocking)
                            System.Threading.Thread thread = new System.Threading.Thread(new System.Threading.ThreadStart(delegate()
                            {
                                try {
                                    Dictionary<string, object> verifyPayload = new Dictionary<string, object>();
                                    verifyPayload.Add("staff_id", matchedStaff.id);
                                    verifyPayload.Add("source", "BIOMETRIC");
                                    verifyPayload.Add("latitude", _latitude);
                                    verifyPayload.Add("longitude", _longitude);
                                    _api.Post("/api/v1/kiosk/verify", verifyPayload);
                                } catch { }
                            }));
                            thread.IsBackground = true;
                            thread.Start();
                        }
                        else
                        {
                            _latestScan = new { status = "NO_MATCH", timestamp = nowTs };
                            SetStatusMessage("Unknown Fingerprint", "No staff record found locally.", Colors.Red);
                        }

                        EndScan:
                        DispatcherTimer timer = new DispatcherTimer();
                        timer.Interval = TimeSpan.FromSeconds(4);
                        timer.Tick += new System.EventHandler(delegate(object s, EventArgs e)
                        {
                            timer.Stop();
                            ProgressDots.Visibility = Visibility.Collapsed;
                            TxtBigFingerprint.Visibility = Visibility.Collapsed;
                            ResetWaiting();
                        });
                        timer.Start();
                    }
                    else if (_mode == "enroll")
                    {
                        try
                        {
                            // 1. Extract Features
                            FeatureExtraction extraction = new FeatureExtraction();
                            CaptureFeedback enrollFeedback = CaptureFeedback.None;
                            FeatureSet enrollFeatures = new FeatureSet();
                            extraction.CreateFeatureSet(sample, DataPurpose.Enrollment, ref enrollFeedback, ref enrollFeatures);

                            if (enrollFeedback != CaptureFeedback.Good)
                            {
                                string tip = "Please scan again.";
                                switch (enrollFeedback)
                                {
                                    case CaptureFeedback.LowContrast: tip = "Finger too dry? Try breathing on it to moisten."; break;
                                    case CaptureFeedback.TooLight: tip = "Press a bit firmer on the sensor."; break;
                                    case CaptureFeedback.TooDark: tip = "Too much pressure. Press a bit lighter."; break;
                                    case CaptureFeedback.TooSkewed: tip = "Keep your finger straight and centered."; break;
                                    case CaptureFeedback.TooShort: tip = "Place more of your finger surface on the scanner."; break;
                                }
                                SetStatusMessage("Scan Rejected", tip, Colors.Orange);
                                return;
                            }

                            // 2. Process 4 scans to build template
                            try
                            {
                                _enrollment.AddFeatures(enrollFeatures);
                                _enrollmentSuccessCount++;
                                _enrollmentMismatchCount = 0; // Reset mismatch counter on good scan
                                
                                // Update UI
                                for (int i = 0; i < _enrollmentSuccessCount; i++) 
                                    DotElements[i].Background = new SolidColorBrush(Color.FromRgb(0, 120, 215));

                                if (_enrollment.TemplateStatus != Enrollment.Status.Ready)
                                {
                                    SetStatusMessage("Good Scan", string.Format("Scan {0}/4 successful. Place finger again.", _enrollmentSuccessCount), Colors.Blue);
                                }
                                else
                                {
                                    // Template is READY!
                                    SetStatusMessage("Success", "Template generated. Finalizing...", Colors.Green);

                                    Template template = _enrollment.Template;
                                    byte[] bytes;
                                    using (MemoryStream ms = new MemoryStream()) { template.Serialize(ms); bytes = ms.ToArray(); }
                                    string templateB64 = Convert.ToBase64String(bytes);
                                    
                                    if (string.IsNullOrEmpty(_primaryTemplateB64)) 
                                    {
                                        _primaryTemplateB64 = templateB64;
                                        if (_driverExists) { _enrollment = new Enrollment(); }
                                        _enrollmentSuccessCount = 0;
                                        SetStatusMessage("Left Finger Saved", "Now place RIGHT finger (Scan 1/4)", Colors.Blue);
                                        foreach (var dot in DotElements) dot.Background = new SolidColorBrush(Color.FromRgb(226, 232, 240));
                                        return;
                                    }

                                    string staffPin = _tempEnrollPin;

                                    System.Threading.Thread thread = new System.Threading.Thread(new System.Threading.ThreadStart(delegate()
                                    {
                                        Dictionary<string, object> payload = new Dictionary<string, object>();
                                        payload.Add("staff_id", _enrollingStaffId);
                                        payload.Add("template", _primaryTemplateB64 + "," + templateB64);
                                        if (!string.IsNullOrEmpty(staffPin)) payload.Add("pin", staffPin);

                                        string response = null;
                                        if (System.Net.NetworkInformation.NetworkInterface.GetIsNetworkAvailable())
                                        {
                                            response = _api.Post("/api/v1/kiosk/enroll", payload);
                                        }
                                        
                                        Dispatcher.Invoke(new Action(delegate() {
                                            bool isDuplicate = false;
                                            if (!string.IsNullOrEmpty(response)) {
                                                try {
                                                    JavaScriptSerializer js = new JavaScriptSerializer();
                                                    var resObj = js.Deserialize<Dictionary<string, object>>(response);
                                                    if (resObj.ContainsKey("success") && !(bool)resObj["success"]) {
                                                        isDuplicate = true;
                                                        string errMsg = resObj.ContainsKey("message") ? (string)resObj["message"] : "Enrollment failed.";
                                                        SetStatusMessage("Duplicate Found", errMsg, Colors.Red);
                                                        
                                                        // Reset state so they can try again
                                                        _primaryTemplateB64 = "";
                                                        if (_driverExists) { _enrollment = new Enrollment(); }
                                                        _enrollmentSuccessCount = 0;
                                                        foreach (var dot in DotElements) dot.Background = new SolidColorBrush(Color.FromRgb(226, 232, 240));
                                                        return;
                                                    }
                                                } catch { }

                                                if (!isDuplicate) {
                                                    SetStatusMessage("Complete", "Staff enrolled successfully", Colors.Green);
                                                }
                                            } else {
                                                SetStatusMessage("Offline", "Enrollment saved locally (sync pending)", Colors.Orange);
                                                _db.QueuePendingEnrollment(_enrollingStaffId, _primaryTemplateB64 + "," + templateB64, staffPin);
                                            }
                                            
                                            if (!isDuplicate)
                                            {
                                                // Save locally only when NOT a duplicate
                                                _db.UpdateStaffTemplate(_enrollingStaffId, _primaryTemplateB64 + "," + templateB64);
                                                
                                                // Refresh local cache and list
                                                _staffCache = _db.LoadStaff();
                                                RefreshTemplateCache();
                                                LstStaff.ItemsSource = _staffCache;
                                            }
                                            
                                            // Reset enrollment state variables
                                            _primaryTemplateB64 = "";
                                            if (_driverExists) { _enrollment = new Enrollment(); }
                                            _enrollmentSuccessCount = 0;
                                            _enrollmentMismatchCount = 0;

                                            DispatcherTimer timerEnd = new DispatcherTimer();
                                            timerEnd.Interval = TimeSpan.FromSeconds(3);
                                            timerEnd.Tick += (s, e) => {
                                                timerEnd.Stop();
                                                ProgressDots.Visibility = Visibility.Collapsed;
                                                TxtBigFingerprint.Visibility = Visibility.Collapsed;
                                                BtnEnrollment_Click(null, null); // Return cleanly to enrollment list view
                                            };
                                            timerEnd.Start();
                                        }));
                                    }));
                                    thread.IsBackground = true;
                                    thread.Start();
                                }
                            }
                            catch (Exception exAdd)
                            {
                                _enrollmentMismatchCount++;
                                Log("Enrollment: Mismatch error (" + _enrollmentMismatchCount + "/3): " + exAdd.Message);
                                
                                if (_enrollmentMismatchCount >= 3)
                                {
                                    // Too many mismatches — reset this finger's enrollment
                                    if (_driverExists) { _enrollment = new Enrollment(); }
                                    _enrollmentSuccessCount = 0;
                                    _enrollmentMismatchCount = 0;
                                    foreach (var dot in DotElements) dot.Background = new SolidColorBrush(Color.FromRgb(226, 232, 240));
                                    
                                    if (!string.IsNullOrEmpty(_primaryTemplateB64))
                                    {
                                        SetStatusMessage("Reset", "Too many mismatches. Restarting RIGHT finger (Scan 1/4)", Colors.Orange);
                                    }
                                    else
                                    {
                                        SetStatusMessage("Reset", "Too many mismatches. Restarting LEFT finger (Scan 1/4)", Colors.Orange);
                                    }
                                }
                                else
                                {
                                    SetStatusMessage("Mismatch", "Inconsistent scan (" + _enrollmentMismatchCount + "/3). Use the SAME finger and center it.", Colors.Red);
                                }
                            }
                        }
                        catch (Exception ex)
                        {
                            Log("Enrollment Error: " + ex.ToString());
                            SetStatusMessage("Enrollment Failed", "Please try again or use PIN.", Colors.Red);
                        }
                    }
                }));
            }
            else
            {
                Dispatcher.Invoke(new Action(delegate() { SetStatusMessage("Poor Quality", "Please try scanning again.", Colors.Red); }));
            }
            }
            catch (Exception ex)
            {
                Log("OnComplete Error: " + ex.Message);
                Dispatcher.Invoke(new Action(delegate()
                {
                    SetStatusMessage("Scan Error", "Scanner encountered a problem. Resetting...", Colors.Red);

                    DispatcherTimer timer = new DispatcherTimer();
                    timer.Interval = TimeSpan.FromSeconds(4);
                    timer.Tick += new System.EventHandler(delegate(object s, EventArgs e)
                    {
                        timer.Stop();
                        ProgressDots.Visibility = Visibility.Collapsed;
                        TxtBigFingerprint.Visibility = Visibility.Collapsed;
                        ResetWaiting();
                    });
                    timer.Start();
                }));
            }
            finally
            {
                _isProcessingScan = false;
            }
        }

        public void OnFingerTouch(object capture, string readerSerialNumber)
        {
            Dispatcher.Invoke(new Action(delegate() { SetStatusMessage("Scanning...", "Reading fingerprint data", Colors.Blue); }));
        }

        public void OnFingerGone(object capture, string readerSerialNumber)
        {
            // Optional: Handle finger removal
        }

        public void OnReaderConnect(object capture, string readerSerialNumber)
        {
            Dispatcher.Invoke(new Action(delegate()
            {
                TxtScannerStatus.Text = "Scanner Online";
                TxtScannerStatus.Foreground = new SolidColorBrush(Color.FromRgb(16, 124, 16));
            }));
        }

        public void OnReaderDisconnect(object capture, string readerSerialNumber)
        {
            Dispatcher.Invoke(new Action(delegate()
            {
                TxtScannerStatus.Text = "Scanner Offline";
                TxtScannerStatus.Foreground = new SolidColorBrush(Colors.Red);
                SetStatusMessage("Scanner Disconnected", "Please check USB connection.", Colors.Red);
            }));
        }

        public void OnSampleQuality(object capture, string readerSerialNumber, CaptureFeedback captureFeedback)
        {
        }

        // UI Helpers
        private void ShowProfileCard(StaffRecord staff, string type, string message, bool isLate = false, int minutesLate = 0)
        {
            Dispatcher.Invoke(new Action(delegate()
            {
                if (staff == null) return;
                if (_profileTimer != null) _profileTimer.Stop();
                
                Log("Showing Profile Card for: " + staff.name + " (" + type + ")");
                ProfileName.Text = staff.name;
                ProfileRole.Text = !string.IsNullOrWhiteSpace(staff.role) ? staff.role : "Employee";
                ProfileDept.Text = !string.IsNullOrWhiteSpace(staff.department) ? staff.department : "General";
                ProfileId.Text = staff.personnel_number;
                ProfileBranch.Text = _branchName ?? "Main Branch";
                ProfileTime.Text = DateTime.Now.ToString("hh:mm tt");
                
                if (type == "PROCESSING") {
                    ProfileCardBorder.Background = new SolidColorBrush(Color.FromRgb(241, 245, 249)); // Slate-100
                    ProfileStatusBadge.Text = "RECORDING...";
                    ProfileStatusBadge.Background = new SolidColorBrush(Color.FromRgb(100, 116, 139)); // Slate-500
                }
                else if (type == "OFFLINE") {
                    ProfileCardBorder.Background = new SolidColorBrush(Color.FromRgb(254, 243, 199)); // Amber-100
                    ProfileStatusBadge.Text = "OFFLINE ✓";
                    ProfileStatusBadge.Background = Brushes.Orange;
                }
                else if (type == "CLOCKED_IN") {
                    ProfileCardBorder.Background = new SolidColorBrush(Color.FromRgb(254, 243, 199)); // Amber-100
                    ProfileStatusBadge.Text = "ALREADY CLOCKED IN ✓";
                    ProfileStatusBadge.Background = Brushes.Orange;
                }
                else if (type == "CLOCK_OUT") {
                    ProfileCardBorder.Background = new SolidColorBrush(Color.FromRgb(219, 234, 254)); // Blue-100
                    ProfileStatusBadge.Text = "CLOCKED OUT ✓";
                    ProfileStatusBadge.Background = new SolidColorBrush(Color.FromRgb(37, 99, 235)); // Blue-600
                }
                else if (isLate) {
                    ProfileCardBorder.Background = new SolidColorBrush(Color.FromRgb(254, 226, 226)); // Red-100
                    string lateStr = "";
                    if (minutesLate >= 60) {
                        int hrs = minutesLate / 60;
                        int mins = minutesLate % 60;
                        lateStr = hrs + "h " + mins + "m";
                    } else {
                        lateStr = minutesLate + "m";
                    }
                    ProfileStatusBadge.Text = "LATE — " + lateStr;
                    ProfileStatusBadge.Background = Brushes.Red;
                } else {
                    ProfileCardBorder.Background = new SolidColorBrush(Color.FromRgb(220, 252, 231)); // Green-100
                    ProfileStatusBadge.Text = "ON TIME! ✓";
                    ProfileStatusBadge.Background = Brushes.Green;
                }
                
                ProfilePhoto.Source = null; // Clear old image immediately
                if (!string.IsNullOrEmpty(staff.photo_url))
                {
                    string url = staff.photo_url;
                    System.Threading.Thread imgThread = new System.Threading.Thread(new System.Threading.ThreadStart(delegate()
                    {
                        try {
                            using (var md5 = System.Security.Cryptography.MD5.Create())
                            {
                                byte[] inputBytes = System.Text.Encoding.ASCII.GetBytes(url);
                                byte[] hashBytes = md5.ComputeHash(inputBytes);
                                string hashStr = BitConverter.ToString(hashBytes).Replace("-", "").ToLower();
                                string photoDir = System.IO.Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "Proxima-Kiosk", "photos");
                                if (!System.IO.Directory.Exists(photoDir)) System.IO.Directory.CreateDirectory(photoDir);
                                string localPath = System.IO.Path.Combine(photoDir, staff.id + "_" + hashStr + ".jpg");

                                byte[] data = null;
                                if (System.IO.File.Exists(localPath)) {
                                    data = System.IO.File.ReadAllBytes(localPath);
                                } else if (System.Net.NetworkInformation.NetworkInterface.GetIsNetworkAvailable()) {
                                    using (var client = new System.Net.WebClient()) {
                                        data = client.DownloadData(url);
                                        System.IO.File.WriteAllBytes(localPath, data);
                                    }
                                }

                                if (data != null) {
                                    var bmi = new System.Windows.Media.Imaging.BitmapImage();
                                    bmi.BeginInit();
                                    bmi.StreamSource = new System.IO.MemoryStream(data);
                                    bmi.CacheOption = System.Windows.Media.Imaging.BitmapCacheOption.OnLoad;
                                    bmi.EndInit();
                                    bmi.Freeze(); // Makes the image thread-safe so it doesn't freeze UI
                                    Dispatcher.Invoke(new Action(delegate() {
                                        try { ProfilePhoto.Source = bmi; } catch { }
                                    }));
                                }
                            }
                        } catch (Exception ex) { Log("Photo Load Error: " + ex.Message); }
                    }));
                    imgThread.IsBackground = true;
                    imgThread.Start();
                }
                
                ProfileOverlayGrid.Visibility = Visibility.Visible;
                
                _profileTimer = new DispatcherTimer();
                _profileTimer.Interval = TimeSpan.FromSeconds(5);
                _profileTimer.Tick += (s, e) => { 
                    _profileTimer.Stop(); 
                    ProfileOverlayGrid.Visibility = Visibility.Collapsed; 
                    ResetWaiting(); 
                };
                _profileTimer.Start();
            }));
        }

        private void CalculateLateness(StaffRecord staff, out bool isLate, out int minutesLate)
        {
            isLate = false;
            minutesLate = 0;
            if (staff == null || string.IsNullOrEmpty(staff.shift_start)) return;

            try
            {
                TimeSpan shiftStart;
                if (TimeSpan.TryParse(staff.shift_start, out shiftStart))
                {
                    DateTime now = DateTime.Now;
                    DateTime shiftDateTime = now.Date.Add(shiftStart);
                    
                    int grace = staff.grace_period;
                    DateTime deadline = shiftDateTime.AddMinutes(grace);
                    
                    if (now > deadline)
                    {
                        isLate = true;
                        minutesLate = (int)(now - shiftDateTime).TotalMinutes;
                    }
                }
            }
            catch (Exception ex)
            {
                Log("CalculateLateness error: " + ex.Message);
            }
        }

        private void SetStatusMessage(string title, string subtitle, Color color)
        {
            Dispatcher.Invoke(new Action(delegate()
            {
                TxtScanMessage.Text = title;
                TxtScanMessage.Foreground = new SolidColorBrush(color);
                TxtScanSubMessage.Text = subtitle;
            }));
        }

        private void ResetWaiting()
        {
            Dispatcher.Invoke(new Action(delegate()
            {
                if (_mode == "attendance")
                    SetStatusMessage("Ready to Scan", "Place thumb on the sensor", Colors.Black);
            }));
        }

        // Navigation Handlers
        private void BtnAttendance_Click(object sender, RoutedEventArgs e)
        {
            _mode = "attendance";
            if (_driverExists) { _enrollment = new Enrollment(); }
            _primaryTemplateB64 = "";
            _enrollmentSuccessCount = 0;
            _enrollmentMismatchCount = 0;
            _currentEnrollingStaff = null;
            
            ViewAttendance.Visibility = Visibility.Visible;
            ViewEnrollment.Visibility = Visibility.Collapsed;
            
            BtnAttendance.Background = new SolidColorBrush(Color.FromRgb(235, 245, 255));
            BtnAttendance.Foreground = new SolidColorBrush(Color.FromRgb(0, 120, 215));
            
            BtnEnrollment.Background = new SolidColorBrush(Colors.Transparent);
            BtnEnrollment.Foreground = new SolidColorBrush(Color.FromRgb(100, 116, 139));
            
            SetStatusMessage("Ready to Scan", "Place thumb on the sensor", Colors.Black);
        }

        private void BtnEnrollment_Click(object sender, RoutedEventArgs e)
        {
            _mode = "enroll";
            if (_driverExists) { _enrollment = new Enrollment(); }
            _primaryTemplateB64 = "";
            _enrollmentSuccessCount = 0;
            _enrollmentMismatchCount = 0;
            _currentEnrollingStaff = null;
            
            ViewAttendance.Visibility = Visibility.Collapsed;
            ViewEnrollment.Visibility = Visibility.Visible;
            
            BtnEnrollment.Background = new SolidColorBrush(Color.FromRgb(235, 245, 255));
            BtnEnrollment.Foreground = new SolidColorBrush(Color.FromRgb(0, 120, 215));
            
            BtnAttendance.Background = new SolidColorBrush(Colors.Transparent);
            BtnAttendance.Foreground = new SolidColorBrush(Color.FromRgb(100, 116, 139));
        }

        private void BtnExit_Click(object sender, RoutedEventArgs e)
        {
            if (_agentServer != null) _agentServer.Stop();
            Application.Current.Shutdown();
        }

        // Agent Helpers
        public object GetAgentStatus()
        {
            return new {
                status = "ONLINE",
                terminal_id = _config.TERMINAL_ID,
                is_activated = _config.IS_ACTIVATED,
                branch_name = _branchName,
                scanner_connected = (_capturer != null)
            };
        }

        public object GetLatestCapture()
        {
            return _latestScan;
        }

        public List<StaffRecord> GetStaffList()
        {
            return _staffCache;
        }
    }

    public class NameToInitialConverter : IValueConverter
    {
        public object Convert(object value, Type targetType, object parameter, System.Globalization.CultureInfo culture)
        {
            try
            {
                string name = value as string;
                if (string.IsNullOrEmpty(name)) return "?";
                var parts = name.Split(new[] { ' ', ',', '-' }, StringSplitOptions.RemoveEmptyEntries);
                if (parts.Length == 0) return "?";
                if (parts.Length > 1)
                {
                    string first = parts[0];
                    string second = parts[1];
                    if (first.Length > 0 && second.Length > 0)
                        return (first[0].ToString() + second[0].ToString()).ToUpper();
                }
                if (parts[0].Length > 0)
                    return parts[0][0].ToString().ToUpper();
                return "?";
            }
            catch
            {
                return "?";
            }
        }
        public object ConvertBack(object value, Type targetType, object parameter, System.Globalization.CultureInfo culture) { return null; }
    }

    public class EnrollmentStatusConverter : IValueConverter
    {
        public object Convert(object value, Type targetType, object parameter, System.Globalization.CultureInfo culture)
        {
            string template = value as string;
            return (string.IsNullOrEmpty(template) || template == "0" || template.Length < 10) ? "PENDING" : "ENROLLED";
        }
        public object ConvertBack(object value, Type targetType, object parameter, System.Globalization.CultureInfo culture) { return null; }
    }

    public class EnrollmentColorConverter : IValueConverter
    {
        public object Convert(object value, Type targetType, object parameter, System.Globalization.CultureInfo culture)
        {
            string template = value as string;
            bool enrolled = !(string.IsNullOrEmpty(template) || template == "0" || template.Length < 10);
            return new SolidColorBrush(enrolled ? Color.FromRgb(34, 197, 94) : Color.FromRgb(245, 158, 11));
        }
        public object ConvertBack(object value, Type targetType, object parameter, System.Globalization.CultureInfo culture) { return null; }
    }

    public class EnrollmentVisibilityConverter : IValueConverter
    {
        public object Convert(object value, Type targetType, object parameter, System.Globalization.CultureInfo culture)
        {
            string template = value as string;
            bool enrolled = !(string.IsNullOrEmpty(template) || template == "0" || template.Length < 10);
            return enrolled ? Visibility.Collapsed : Visibility.Visible;
        }
        public object ConvertBack(object value, Type targetType, object parameter, System.Globalization.CultureInfo culture) { return null; }
    }
}
