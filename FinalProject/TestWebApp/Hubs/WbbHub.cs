using Microsoft.AspNetCore.SignalR;
using WiimoteLib;

namespace TestWebApp.Hubs
{
    public class WbbHub : Hub
    {
        public async Task SendSensors()
        {
            if(Program.bb == null){
                return;
            }
            BalanceBoardSensorsF sensors = Program.bb.WiimoteState.BalanceBoardState.SensorValuesKg;
            await Clients.All.SendAsync("ReceiveSensors", sensors.TopLeft, sensors.TopRight, sensors.BottomLeft, sensors.BottomRight);
        }
    }
}