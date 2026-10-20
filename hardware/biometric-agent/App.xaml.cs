using System;
using System.Windows;

namespace KioskNative
{
    public partial class App : Application
    {
        [STAThread]
        public static void Main()
        {
            // Enable all modern TLS security protocols (TLS 1.2 and TLS 1.3)
            try
            {
                System.Net.ServicePointManager.DefaultConnectionLimit = 50;
                System.Net.ServicePointManager.SecurityProtocol = 
                    System.Net.SecurityProtocolType.Tls12 | 
                    System.Net.SecurityProtocolType.Tls11 | 
                    System.Net.SecurityProtocolType.Tls | 
                    (System.Net.SecurityProtocolType)12288;
            }
            catch { }

            string appDir = System.IO.Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "Proxima-Kiosk");
            if (!System.IO.Directory.Exists(appDir)) System.IO.Directory.CreateDirectory(appDir);

            AppDomain.CurrentDomain.UnhandledException += (s, e) => {
                try {
                    System.IO.File.WriteAllText(System.IO.Path.Combine(appDir, "crash_fatal.log"), e.ExceptionObject.ToString());
                } catch { }
            };
            try
            {
                App app = new App();
                app.Run(new MainWindow());
            }
            catch (Exception ex)
            {
                try {
                    System.IO.File.WriteAllText(System.IO.Path.Combine(appDir, "startup_error.txt"), ex.ToString());
                } catch { }
                MessageBox.Show("Fatal Startup Error: " + ex.Message);
            }
        }
    }
}
