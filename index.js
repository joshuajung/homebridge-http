var Service, Characteristic;
var request = require("request");
var pollingtoevent = require('polling-to-event');

module.exports = function(homebridge){
	Service = homebridge.hap.Service;
	Characteristic = homebridge.hap.Characteristic;
	homebridge.registerAccessory("homebridge-jositor", "Jositor", JositorAccessory);
}


function JositorAccessory(log, config) {
	this.log = log;

	// JoSi Configuration
	this.open_url			= config["open_url"];
	this.open_body			= config["open_body"];

	// url info
	this.on_url                 = config["on_url"];
	this.on_body                = config["on_body"];
	this.off_url                = config["off_url"];
	this.off_body               = config["off_body"];
	this.status_url             = config["status_url"];
	this.brightness_url         = config["brightness_url"];
	this.brightnesslvl_url      = config["brightnesslvl_url"];
	this.http_method            = config["http_method"] 	  	 	|| "GET";
	this.http_brightness_method = config["http_brightness_method"]  || this.http_method;
	this.username               = config["username"] 	  	 	 	|| "";
	this.password               = config["password"] 	  	 	 	|| "";
	this.sendimmediately        = config["sendimmediately"] 	 	|| "";
	this.service                = config["service"] 	  	 	 	|| "Switch";
	this.name                   = config["name"];
	this.brightnessHandling     = config["brightnessHandling"] 	 	|| "no";
	this.switchHandling 		= config["switchHandling"] 		 	|| "no";

	//realtime polling info
	this.state = false;
	this.currentlevel = 0;
	this.enableSet = true;
	var that = this;

	// Last Open request
	this.lastOpenRequest = 0;

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
		var secondsSinceLastRequest = (Date.now() - this.lastOpenRequest) / 1000;
		this.log(secondsSinceLastRequest + " seconds passed since last request");
		if(secondsSinceLastRequest > 15 && secondsSinceLastRequest < 60) {
			this.log("Sending 'open'")
			callback(null, false)
		} else {
			this.log("Sending 'closed'")
			callback(null, true)
		}
	},

	getTargetGarageState: function(callback) {
		this.log("getTargetGarageState requested");
		var secondsSinceLastRequest = (Date.now() - this.lastOpenRequest) / 1000;
		this.log(secondsSinceLastRequest + " seconds passed since last request");
		if(secondsSinceLastRequest < 60) {
			this.log("Sending 'open'")
			callback(null, false)
		} else {
			this.log("Sending 'closed'")
			callback(null, true)
		}
	},

	setTargetGarageState: function(requestedState, callback) {
		this.log("setTargetGarageState requested, new state " + requestedState);
		this.lastOpenRequest = Date.now()
		this.httpRequest(this.open_url, this.open_body, this.http_method, this.username, this.password, this.sendimmediately, function(error, response, responseBody) {
			if (error) {
				this.log('HTTP request failed: %s', error.message);
				callback(error);
			} else {
				this.log('HTTP request succeeded!');
				garageService.setCharacteristic(Characteristic.CurrentDoorState, Characteristic.CurrentDoorState.OPEN);
				callback();
			}
		}.bind(this));
	},

	getObstructionDetected: function(callback) {
		this.log("getObstructionDetected requested");
		callback(null, false);
	},


	identify: function(callback) {
		this.log("Identify requested!");
		callback(); // success
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

		this.garageService = new Service.GarageDoorOpener(this.name);
		this.garageService.getCharacteristic(Characteristic.CurrentDoorState).on('get', this.getCurrentGarageState.bind(this));
		this.garageService.getCharacteristic(Characteristic.TargetDoorState).on('set', this.setTargetGarageState.bind(this));
		this.garageService.getCharacteristic(Characteristic.TargetDoorState).on('get', this.getTargetGarageState.bind(this));
		this.garageService.getCharacteristic(Characteristic.ObstructionDetected).on('get', this.getObstructionDetected.bind(this));

		return [this.garageService];

	}

};
