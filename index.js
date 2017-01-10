var Service, Characteristic;
var request = require("request");

module.exports = function(homebridge){
	Service = homebridge.hap.Service;
	Characteristic = homebridge.hap.Characteristic;
	homebridge.registerAccessory("homebridge-jositor", "Jositor", JositorAccessory);
}

function JositorAccessory(log, config) {
	var that = this;
	this.log = log;

	// JoSi Configuration
	this.open_url				= config["open_url"];
	this.open_body				= config["open_body"];
	this.http_method            = config["http_method"] 	  	 	|| "GET";
	this.username               = config["username"] 	  	 	 	|| "";
	this.password               = config["password"] 	  	 	 	|| "";
	this.sendimmediately        = config["sendimmediately"] 	 	|| "";
	this.service                = config["service"] 	  	 	 	|| "Switch";
	this.name                   = config["name"];

	// Current state
	this.doorState = 1;
	this.outletState = 0;

}

JositorAccessory.prototype = {

	httpRequest: function(url, body, method, username, password, sendimmediately, callback) {
		request({
			url: url,
			body: body,
			method: method,
			rejectUnauthorized: false,
			auth: {
				user: username,
				pass: password,
				sendImmediately: sendimmediately
			}
		},
		function(error, response, body) {
			callback(error, response, body)
		})
	},

	getCurrentGarageState: function(callback) {
		this.log("getCurrentGarageState requested");
		callback(null, this.doorState);
	},

	getTargetGarageState: function(callback) {
		this.log("getTargetGarageState requested");
		callback(null, this.doorState);
	},

	setTargetGarageState: function(requestedState, callback) {
		var that = this;
		// 1=close, 0=open
		this.log("setTargetGarageState requested, new state " + requestedState);
		if(requestedState == 0) {
			this.httpRequest(this.open_url, this.open_body, this.http_method, this.username, this.password, this.sendimmediately, function(error, response, responseBody) {
				if (error) {
					this.doorState = 1;
					this.log('HTTP request failed: %s', error.message);
					this.garageService.setCharacteristic(Characteristic.CurrentDoorState, Characteristic.CurrentDoorState.CLOSED);
					callback(error);
				} else {
					this.log('HTTP request succeeded!');
					this.doorState = 0;
					this.garageService.setCharacteristic(Characteristic.CurrentDoorState, Characteristic.CurrentDoorState.OPEN);
					// Setzt Garage anschließend wieder auf "geschlossen" zurück
					setTimeout(function() {
						that.log("Set garage back to closed.");
						that.garageService.setCharacteristic(Characteristic.TargetDoorState, Characteristic.TargetDoorState.CLOSED);
						that.garageService.setCharacteristic(Characteristic.CurrentDoorState, Characteristic.CurrentDoorState.CLOSED);
						that.doorState = 1;
					}, 60000);
					callback();
				}
			}.bind(this));
		} else {
			this.doorState = 1;
			this.garageService.setCharacteristic(Characteristic.CurrentDoorState, Characteristic.CurrentDoorState.CLOSED);
			callback();
		}
	},

	getObstructionDetected: function(callback) {
		this.log("getObstructionDetected requested");
		callback(null, false);
	},

	identify: function(callback) {
		this.log("Identify requested!");
		callback(); // success
	},

	outletOnTriggered: function(requestedState, callback) {
		var that = this;
		this.log("outletOnTriggered requested, new state " + requestedState);
		if(requestedState == 1) {
			this.httpRequest(this.open_url, this.open_body, this.http_method, this.username, this.password, this.sendimmediately, function(error, response, responseBody) {
				if (error) {
					this.doorState = 0;
					this.log('HTTP request failed: %s', error.message);
					this.outletService.setCharacteristic(Characteristic.On, 0);
					callback(error);
				} else {
					this.log('HTTP request succeeded!');
					this.doorState = 1;
					this.outletService.setCharacteristic(Characteristic.On, 1);
					// Setzt Garage anschließend wieder auf "geschlossen" zurück
					setTimeout(function() {
						that.log("Set outlet back to off.");
						that.outletService.setCharacteristic(Characteristic.On, 0);
						that.doorState = 0;
					}, 5000);
					callback();
				}
			}.bind(this));
		} else {
			this.outletState = 0;
			this.outletService.setCharacteristic(Characteristic.On, 0);
			callback();
		}*/
	},

	getServices: function() {

		var that = this;

		// you can OPTIONALLY create an information service if you wish to override
		// the default values for things like serial number, model, etc.
		var informationService = new Service.AccessoryInformation();

		informationService
		.setCharacteristic(Characteristic.Manufacturer, "JoSi")
		.setCharacteristic(Characteristic.Model, "JoSiTor")
		.setCharacteristic(Characteristic.SerialNumber, "001");

		// Garagenservices
		this.garageService = new Service.GarageDoorOpener(this.name);
		this.garageService.getCharacteristic(Characteristic.CurrentDoorState).on('get', this.getCurrentGarageState.bind(this));
		this.garageService.getCharacteristic(Characteristic.TargetDoorState).on('set', this.setTargetGarageState.bind(this));
		this.garageService.getCharacteristic(Characteristic.TargetDoorState).on('get', this.getTargetGarageState.bind(this));
		this.garageService.getCharacteristic(Characteristic.ObstructionDetected).on('get', this.getObstructionDetected.bind(this));

		// Outlet Service
		this.outletService = new Service.Outlet(this.name);
		this.outletService.getCharacteristic(Characteristic.On).on('set', this.outletOnTriggered.bind(this));

		// Services returnen
		return [this.outletService, informationService];

	}

};
