# Light Prop

![alt text](https://raw.githubusercontent.com/tjbaron/PropLight/main/img/1.png)
![alt text](https://raw.githubusercontent.com/tjbaron/PropLight/main/img/2.png)

This project allows professional grade rgb film lights to mimic a source video. This is useful to simulate fire, police lights, thunder and more. There is also a field in the app that allows you to specify effects via math equations. Equations are run at 30 fps, retain variable memory from the last frame and allow you to set hue, saturation and brightness (be aware that HSB and HSL are not the same). The following example equation will give you something similar to police lights:

	hue = 360-(cos(time*10)*55)-55
	saturation = 100
	brightness = (time-last > 4 ? random()*100 : 100)
	last = time-last>5 ? time : last

The `app` folder contains everything necessary to build a desktop Electron app. This app controls a small Node.js service running on a Raspberry Pi or similar SBC. You will need to build a small circuit for your Raspberry Pi that allows it connect to your studio light via DMX on pin 27. A simple circuit as discussed [here](https://electronics.stackexchange.com/questions/100487/dmx-on-arduino-with-rs485) may be sufficient, but it is your responsibility to ensure your chosen circuitry is safe and will not damage your equipment.

Note that `npm install` will be needed to be run in the root folder on the Pi, and in the `app` folder on your desktop before building the electron app using `electron-packager`.

# Setup the Pi

Here are the general steps to get you Pi setup:

* Setup Pi as an wireless access point, or connect to your desired network.
* `git pull https://github.com/tjbaron/LightProp`
* `cd LightProp; npm install`
* `crontab -e`
* Add `restart /usr/bin/node /home/root/LightProp/index.js`

# Build Desktop App

Do this on your desktop computer, not the Pi.

* `npm install electron-packager -g`
* `git pull https://github.com/tjbaron/LightProp`
* `cd LightProp/app/`
* `npm install`
* `electron-packager . LightProp --platform=darwin --arch=x64`

Note the last step builds for Mac OS. Adjust the platform and arch as necessary.

# Usage

The Electron app allows you to preview light behaviour, even without a Raspberry Pi. Feel free to experiment.
