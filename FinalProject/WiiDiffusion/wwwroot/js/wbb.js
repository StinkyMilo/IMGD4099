"use strict";

var SensorValues = {
    tl: 0,
    tr: 0,
    bl: 0,
    br: 0
};

const hubConnection = new signalR.HubConnectionBuilder().withUrl('/wbbHub').build();
hubConnection.on("ReceiveSensors",function(topLeft, topRight, bottomLeft, bottomRight){
    SensorValues.tl=topLeft;
    SensorValues.tr=topRight;
    SensorValues.bl=bottomLeft;
    SensorValues.br=bottomRight;
});

hubConnection.start().then(function(){
    setInterval(function(){
        hubConnection.invoke("SendSensors").catch(function(err){
            return console.error(err.toString());
        });
    },30);
}).catch(function(err){
    console.error(err.toString());
});