using System;
using System.Net;
using System.Text;
using System.Threading;
using System.Web.Script.Serialization;
using System.Collections.Generic;

namespace KioskNative
{
    public class AgentServer
    {
        private HttpListener _listener;
        private bool _running = false;
        private MainWindow _window;
        private JavaScriptSerializer _json = new JavaScriptSerializer();

        public AgentServer(MainWindow window)
        {
            _window = window;
        }

        public void Start()
        {
            try
            {
                _listener = new HttpListener();
                _listener.Prefixes.Add("http://127.0.0.1:5050/");
                _listener.Start();
                _running = true;

                Thread thread = new Thread(new ThreadStart(Listen));
                thread.IsBackground = true;
                thread.Start();
                Console.WriteLine("Local Agent Server started on port 5050");
            }
            catch (Exception ex)
            {
                Console.WriteLine("Failed to start Agent Server: " + ex.Message);
            }
        }

        private void Listen()
        {
            while (_running)
            {
                try
                {
                    HttpListenerContext context = _listener.GetContext();
                    ProcessRequest(context);
                }
                catch { }
            }
        }

        private void ProcessRequest(HttpListenerContext context)
        {
            string path = context.Request.Url.AbsolutePath.ToLower();
            object response = new { success = false, message = "Not Found" };

            if (path == "/status")
            {
                response = _window.GetAgentStatus();
            }
            else if (path == "/capture")
            {
                response = _window.GetLatestCapture();
            }
            else if (path == "/staff")
            {
                response = new { success = true, data = _window.GetStaffList() };
            }

            string jsonResponse = _json.Serialize(response);
            byte[] buffer = Encoding.UTF8.GetBytes(jsonResponse);

            context.Response.ContentType = "application/json";
            context.Response.AddHeader("Access-Control-Allow-Origin", "*");
            context.Response.ContentLength64 = buffer.Length;
            context.Response.OutputStream.Write(buffer, 0, buffer.Length);
            context.Response.Close();
        }

        public void Stop()
        {
            _running = false;
            try {
                if (_listener != null) _listener.Stop();
            } catch { }
        }
    }
}
