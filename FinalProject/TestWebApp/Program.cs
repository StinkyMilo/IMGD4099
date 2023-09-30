using System.Net.Sockets;
using System.Timers;
using WiimoteLib;
using TestWebApp.Hubs;

public class Program{
    public static Wiimote? bb;
    static ConnectionManager? cm;

    static void ConnectBalanceBoard(bool WasJustConnected){
        bool Connected = true; try { bb = new Wiimote(); bb.Connect(); bb.SetLEDs(1); bb.GetStatus(); } catch { Connected = false; }

        if (!Connected || bb == null || bb.WiimoteState.ExtensionType != ExtensionType.BalanceBoard)
        {
            if (ConnectionManager.ElevateProcessNeedRestart()) {  return; }
            if (cm == null) cm = new ConnectionManager();
            cm.ConnectNextWiiMote();
            return;
        }
        if (cm != null) { cm.Cancel(); cm = null; }
    }
    public static void Main(string[] args){
        ConnectBalanceBoard(false);
        
        var builder = WebApplication.CreateBuilder(args);

        // Add services to the container.
        builder.Services.AddRazorPages();
        builder.Services.AddSignalR();

        var app = builder.Build();

        // Configure the HTTP request pipeline.
        if (!app.Environment.IsDevelopment())
        {
            app.UseExceptionHandler("/Error");
            // The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
            app.UseHsts();
        }

        app.UseHttpsRedirection();
        app.UseStaticFiles();

        app.UseRouting();

        app.UseAuthorization();

        app.MapRazorPages();
        app.MapHub<WbbHub>("/wbbHub");

        app.Run();
    }

}



