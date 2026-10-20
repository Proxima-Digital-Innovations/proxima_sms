using System;
using System.IO;
using System.Net;
using System.Text;
using System.Web.Script.Serialization;
using System.Collections.Generic;

namespace KioskNative
{
    public class ApiClient
    {
        private AppConfig _config;
        private JavaScriptSerializer _json = new JavaScriptSerializer();

        public ApiClient(AppConfig config)
        {
            _config = config;
        }

        private void Log(string msg)
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

                File.AppendAllText(logPath, string.Format("[{0}] API: {1}\n", DateTime.Now.ToString("HH:mm:ss"), msg));
            } catch { }
        }

        public string Post(string endpoint, object data)
        {
            foreach (string baseUrl in _config.ERP_ENDPOINTS)
            {
                try
                {
                    string url = baseUrl.TrimEnd('/') + endpoint;
                    Log("POST: " + url + " TID: " + _config.TERMINAL_ID);
                    HttpWebRequest request = (HttpWebRequest)WebRequest.Create(url);
                    request.Method = "POST";
                    request.ContentType = "application/json";
                    request.Timeout = 10000;
                    request.Headers["X-Terminal-ID"] = _config.TERMINAL_ID;

                    if (!string.IsNullOrEmpty(_config.ACCESS_TOKEN))
                    {
                        request.Headers["Authorization"] = "Bearer " + _config.ACCESS_TOKEN;
                    }

                    string jsonPayload = _json.Serialize(data);
                    byte[] byteData = Encoding.UTF8.GetBytes(jsonPayload);
                    request.ContentLength = byteData.Length;

                    using (Stream stream = request.GetRequestStream())
                    {
                        stream.Write(byteData, 0, byteData.Length);
                    }

                    using (HttpWebResponse response = (HttpWebResponse)request.GetResponse())
                    {
                        using (StreamReader reader = new StreamReader(response.GetResponseStream()))
                        {
                            string resText = reader.ReadToEnd();
                            Log("Success POST: " + resText.Substring(0, Math.Min(resText.Length, 50)));
                            return resText;
                        }
                    }
                }
                catch (Exception ex)
                {
                    Log("Error POST: " + ex.Message);
                    Console.WriteLine("API Error (" + baseUrl + "): " + ex.Message);
                }
            }
            return null;
        }

        public string Get(string endpoint)
        {
            foreach (string baseUrl in _config.ERP_ENDPOINTS)
            {
                try
                {
                    string url = baseUrl.TrimEnd('/') + endpoint;
                    Log("GET: " + url);
                    HttpWebRequest request = (HttpWebRequest)WebRequest.Create(url);
                    request.Method = "GET";
                    request.Timeout = 5000;
                    request.Headers["X-Terminal-ID"] = _config.TERMINAL_ID;

                    if (!string.IsNullOrEmpty(_config.ACCESS_TOKEN))
                    {
                        request.Headers["Authorization"] = "Bearer " + _config.ACCESS_TOKEN;
                    }

                    using (HttpWebResponse response = (HttpWebResponse)request.GetResponse())
                    {
                        using (StreamReader reader = new StreamReader(response.GetResponseStream()))
                        {
                            string res = reader.ReadToEnd();
                            Log("Success GET: " + res.Substring(0, Math.Min(res.Length, 50)));
                            return res;
                        }
                    }
                }
                catch (Exception ex)
                {
                    Log("Error GET: " + ex.Message);
                    Console.WriteLine("API Error (" + baseUrl + "): " + ex.Message);
                }
            }
            return null;
        }
    }
}
