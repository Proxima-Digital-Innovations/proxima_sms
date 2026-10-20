using System;
using System.IO;
using System.Collections.Generic;
using System.Web.Script.Serialization;
using System.Linq;

namespace KioskNative
{
    public class AppConfig
    {
        public string[] ERP_ENDPOINTS { get; set; }
        public string TERMINAL_ID { get; set; }
        public string ACCESS_TOKEN { get; set; }
        public bool IS_ACTIVATED { get; set; }
        public int COOLDOWN_SECONDS { get; set; }

        private static string ConfigPath { get { return Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "Proxima-Kiosk", "config.json"); } }

        public static AppConfig Load()
        {
            AppConfig config = null;
            try
            {
                if (File.Exists(ConfigPath))
                {
                    string json = File.ReadAllText(ConfigPath);
                    JavaScriptSerializer serializer = new JavaScriptSerializer();
                    config = serializer.Deserialize<AppConfig>(json);
                }
            }
            catch (Exception ex) 
            { 
                // Fallback to local logging if AppData is problematic
                Console.WriteLine("Load Error: " + ex.Message); 
            }

            if (config == null)
            {
                config = new AppConfig()
                {
                    ERP_ENDPOINTS = new string[] { "http://192.168.1.13:8000" },
                    TERMINAL_ID = GetMacAddress(),
                    IS_ACTIVATED = false,
                    COOLDOWN_SECONDS = 300
                };
                config.Save();
            }

            if (config.ERP_ENDPOINTS == null) config.ERP_ENDPOINTS = new string[] { };
            return config;
        }

        private static string GetMacAddress()
        {
            try
            {
                var nic = System.Net.NetworkInformation.NetworkInterface.GetAllNetworkInterfaces()
                    .Where(n => n.OperationalStatus == System.Net.NetworkInformation.OperationalStatus.Up && n.NetworkInterfaceType != System.Net.NetworkInformation.NetworkInterfaceType.Loopback)
                    .FirstOrDefault();
                if (nic != null)
                {
                    string mac = nic.GetPhysicalAddress().ToString();
                    if (!string.IsNullOrWhiteSpace(mac))
                    {
                        if (mac.Length >= 8)
                            return "KB-" + mac.Substring(mac.Length - 8);
                        return "KB-" + mac;
                    }
                }
            }
            catch { }
            return "KB-" + Guid.NewGuid().ToString().Substring(0, 8).ToUpper();
        }

        public void Save()
        {
            try
            {
                string dir = Path.GetDirectoryName(ConfigPath);
                if (!Directory.Exists(dir)) Directory.CreateDirectory(dir);

                JavaScriptSerializer serializer = new JavaScriptSerializer();
                string json = serializer.Serialize(this);
                File.WriteAllText(ConfigPath, json);
            }
            catch { }
        }
    }
}
