/* This applet provides a Simple Stopwatch.
It is not only useful in its own right
but is also provides a 'tutorial' framework for other more
complex applets - for example it provides a settings screen 
and a 'standard' right click (context) menu which opens 
the settings panel and a Housekeeping submenu accessing
help and a version/update files and also the gnome system monitor program
in case you want to find out how much machine power this applet is 
using at various update rates. 
Items with a ++ in the comment are not specific to this applet and useful for re-use
*/
const Applet = imports.ui.applet; // ++
const Settings = imports.ui.settings; // ++ Needed if you use Settings Screen
const St = imports.gi.St; // ++
const PopupMenu = imports.ui.popupMenu; // ++ Needed for menus
const Lang = imports.lang; //  ++ Needed for menus
const GLib = imports.gi.GLib; // ++ Needed for starting programs
const Mainloop = imports.mainloop; // Needed for timer update loop

// ++ Always needed
function MyApplet(metadata, orientation, panelHeight, instance_id) {
    this._init(metadata, orientation, panelHeight, instance_id);
}

// ++ Always needed
MyApplet.prototype = {
    __proto__: Applet.TextApplet.prototype, // Text Applet

    _init: function (metadata, orientation, panelHeight, instance_id) {
        Applet.TextApplet.prototype._init.call(this, orientation, panelHeight, instance_id);
        try {
            this.settings = new Settings.AppletSettings(this, metadata.uuid, instance_id); // ++ Picks up UUID from metadata for Settings

            this.settings.bindProperty(Settings.BindingDirection.IN, // Setting type
                "refreshInterval-spinner", // The setting key
                "refreshInterval", // The property to manage (this.refreshInterval)
                this.on_settings_changed, // Callback when value changes
                null); // Optional callback data

            this.settings.bindProperty(Settings.BindingDirection.IN,
                "counterTitle",
                "counterTitle",
                this.on_settings_changed,
                null);

            this.settings.bindProperty(Settings.BindingDirection.BIDIRECTIONAL,
                "modeContinueCounting",
                "modeContinueCounting",
                this.on_settings_changed,
                null);

             // The following are generic Settings used to save values through Cinnamon and machine restarts etc
            this.settings.bindProperty(Settings.BindingDirection.BIDIRECTIONAL,
                "counterStatus",
                "counterStatus",
                this.on_generic_changed,
                null);

          this.settings.bindProperty(Settings.BindingDirection.BIDIRECTIONAL,
               "pausedAt",
               "pausedAt",
              this.on_generic_changed,
               null);

            this.settings.bindProperty(Settings.BindingDirection.BIDIRECTIONAL,
                "startTime",
                "startTime",
                this.on_generic_changed,
                null);

            // ++ Make metadata values available within applet for context menu.
            this.cssfile = metadata.path + "/stylesheet.css"; // No longer required
            this.changelog = metadata.path + "/changelog.txt";
            this.helpfile = metadata.path + "/help.txt";
            this.appletPath = metadata.path;
            this.UUID = metadata.uuid;

            // ++ Build Context (Right Click) Menu
            this.buildContextMenu();

            // Set initial conditions

            if(this.counterStatus == "ready") {
                    this.startTime = this.getCurrentTime(); // Called first run before Settings has received a value.
            }


            // Finally start the update loop for the applet display running
            this.updateLoop();
        } catch (e) {
            global.logError(e);
        }
    },

    // ++ Function called when settings are changed
    on_settings_changed: function () {
        this.updateLoop();
    },

    // ++ Null function called when Generic (internal) Setting changed
    on_generic_changed: function () {
    },

    // ++ Build the Right Click Context Menu
    buildContextMenu: function () {
        this._applet_context_menu.removeAll();

        let menuitem = new PopupMenu.PopupMenuItem("Start");
        menuitem.connect('activate', Lang.bind(this, function (event) {
            this.counterStatus = "running";
            this.startTime = this.getCurrentTime();
            this.updateLoop();
        }));
        this._applet_context_menu.addMenuItem(menuitem);

        let menuitem = new PopupMenu.PopupMenuItem("Pause");
        menuitem.connect('activate', Lang.bind(this, function (event) {
            this.counterStatus = "paused";
            this.pausedAt = this,currentCount; // Changed to reduce load on Settings
            this.updateUI();
        }));
        this._applet_context_menu.addMenuItem(menuitem);

        let menuitem = new PopupMenu.PopupMenuItem("Reset counter");
        menuitem.connect('activate', Lang.bind(this, function (event) {
            this.counterStatus = "ready";
            this.updateUI();
        }));
        this._applet_context_menu.addMenuItem(menuitem);

        let menuitem = new PopupMenu.PopupMenuItem("If paused, continue counting from now");
        menuitem.connect('activate', Lang.bind(this, function (event) {
            if (this.counterStatus == "paused") {
                this.updateUI();
                this.counterStatus = "running";
                this.startTime = this.getCurrentTime() - this.pausedAt; // Fudge start time
                this.updateLoop();
            }
        }));
        this._applet_context_menu.addMenuItem(menuitem);

        let menuitem = new PopupMenu.PopupMenuItem("If paused, continue counting from original start time");
        menuitem.connect('activate', Lang.bind(this, function (event) {
            if (this.counterStatus == "paused") {
                this.counterStatus = "running";
                this.updateLoop();
            }
        }));
        this._applet_context_menu.addMenuItem(menuitem);
        this._applet_context_menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        let menuitem = new PopupMenu.PopupMenuItem("Settings");
        menuitem.connect('activate', Lang.bind(this, function (event) {
            GLib.spawn_command_line_async('cinnamon-settings applets ' + this.UUID);
        }));
        this._applet_context_menu.addMenuItem(menuitem);

        this._applet_context_menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        // ++ Set up sub menu for Housekeeping and System Items
        this.subMenu1 = new PopupMenu.PopupSubMenuMenuItem("Housekeeping and System Sub Menu");
        this._applet_context_menu.addMenuItem(this.subMenu1);

        this.subMenuItem1 = new PopupMenu.PopupMenuItem("View the Changelog");
        this.subMenuItem1.connect('activate', Lang.bind(this, function (event) {
            GLib.spawn_command_line_async('gedit ' + this.changelog);
        }));
        this.subMenu1.menu.addMenuItem(this.subMenuItem1); // Note this has subMenu1.menu not subMenu1._applet_context_menu as one might expect

        this.subMenuItem2 = new PopupMenu.PopupMenuItem("Open the Help file");
        this.subMenuItem2.connect('activate', Lang.bind(this, function (event) {
            GLib.spawn_command_line_async('gedit ' + this.helpfile);
        }));
        this.subMenu1.menu.addMenuItem(this.subMenuItem2);


        this.subMenuItem4 = new PopupMenu.PopupMenuItem("Open stylesheet.css  (Advanced Function)");
        this.subMenuItem4.connect('activate', Lang.bind(this, function (event) {
            GLib.spawn_command_line_async('gedit ' + this.cssfile);
        }));
        this.subMenu1.menu.addMenuItem(this.subMenuItem4);

        this.subMenuItem3 = new PopupMenu.PopupMenuItem("Open the gnome system monitor (Advanced testing function)");
        this.subMenuItem3.connect('activate', Lang.bind(this, function (event) {
            GLib.spawn_command_line_async('gnome-system-monitor');
        }));
        this.subMenu1.menu.addMenuItem(this.subMenuItem3);



    },

    // Gets the current time in milliseconds from 1970
    getCurrentTime: function () {
        let d = new Date();
        let x = Math.floor(d.getTime() / 1000);
        return x;
    },

    // Return time formated as hh:mm:ss or mm:ss if hours 0 with a verbose string in this.verboseCount
    formatTime: function (value) {
        let temp = value;
        this.days = Math.floor(temp / (3600 * 24));
        temp = temp - (this.days * 3600 * 24);
        this.hours = Math.floor(temp / 3600);
        temp = temp - (this.hours * 3600);
        this.minutes = Math.floor(temp / 60);
        this.seconds = temp - (this.minutes * 60);
        let string = "";
        this.verboseCount = "";
        if (this.days > 0) {
            this.verboseCount = this.verboseCount + this.days + " days "
        };
        if (this.hours > 0) {
            this.verboseCount = this.verboseCount + this.hours + " hours "
        };
        if (this.minutes < 10) {
            this.verboseCount = this.verboseCount + "0"
        };
        this.verboseCount = this.verboseCount + this.minutes + ":";
        if (this.seconds < 10) {
            this.verboseCount = this.verboseCount + "0"
        };
        this.verboseCount = this.verboseCount + this.seconds;
        if (this.hours > 0 && this.hours < 10) {
            string = string + "0"
        };
        if (this.hours > 0) {
            string = string + this.hours + ":"
        };
        if (this.minutes < 10) {
            string = string + "0"
        };
        string = string + this.minutes + ":";
        if (this.seconds < 10) {
            string = string + "0"
        };
        string = string + this.seconds
        return string;
    },

    // Handler for when the applet is clicked - cycles through states  
    on_applet_clicked: function (event) {
        this.updateUI(); // Update as could be delayed from updateLoop
        if (this.counterStatus == "ready") {
            this.counterStatus = "running";
            this.startTime = this.getCurrentTime();

        } else if (this.counterStatus == "running") {
            this.counterStatus = "paused";
            this.pausedAt = this.currentCount; // Changed to reduce calls to Settings

        } else if (this.counterStatus == "paused") {
            if (this.modeContinueCounting) {
                this.updateUI();
                this.counterStatus = "running";
                this.startTime = this.getCurrentTime() - this.pausedAt; // Fudge start time
            } else {    
                this.counterStatus = "ready"
            }
        }
        this.updateLoop();
    },

    // This updates the numerical display in the applet and in the tooltip and background colour of applet
    updateUI: function () {
        if (this.counterStatus == "running") {
            this.currentCount = this.getCurrentTime() - this.startTime;
            this.set_applet_label(this.formatTime(this.currentCount));
            this.set_applet_tooltip(this.counterTitle + ": Running for  " + this.verboseCount + " - Click to Pause");
              if (this.days > 0) {              
                   this.actor.style_class = 'stopwatch-running-day-exceeded';
              } else {
                   this.actor.style_class = 'stopwatch-running';
              }
        }
        if (this.counterStatus == "paused") {
            this.set_applet_label(this.formatTime(this.pausedAt));
            if (this.modeContinueCounting) {
                this.set_applet_tooltip(this.counterTitle + ": Paused at " + this.verboseCount + " - Click to Continue Counting");
            } else {
                this.set_applet_tooltip(this.counterTitle + ": Paused at " + this.verboseCount + " - Click to Reset");
            }
//              this.actor.style_class = 'stopwatch-paused';
              if (this.days > 0) {              
                   this.actor.style_class = 'stopwatch-paused-day-exceeded';
              } else {
                   this.actor.style_class = 'stopwatch-paused';
              }
        }
//        if (this.days > 0) {
//              this.actor.style_class = 'stopwatch-day-exceeded';
//        }
        if (this.counterStatus == "ready") {
            this.set_applet_tooltip(this.counterTitle + ": Ready - Click to Start");
            this.set_applet_label("00:00");
            this.actor.style_class = 'stopwatch-ready';
        }
    },

    // This is the loop run at refreshInterval rate to call updateUI() to update the display in the applet and tooltip
    updateLoop: function () {
        this.updateUI();
        // Only run updateLoop if counter running to save processsor load
        if (this.counterStatus == "running") {
            Mainloop.timeout_add_seconds(this.refreshInterval, Lang.bind(this, this.updateLoop));
        }
    },

    // ++ This finalises the settings when the applet is removed from the panel
    on_applet_removed_from_panel: function () {
        this.settings.finalize();
    }
};

function main(metadata, orientation, panelHeight, instance_id) {
    let myApplet = new MyApplet(metadata, orientation, panelHeight, instance_id);
    return myApplet;
}
/*
Version v18_1.1.2
0.9.0 Release Candidate 30-07-2013
0.9.1 Help file facility added and link to gnome-system-monitor
0.9.2 Change Hold to Pause in Tooltip
0.9.3 Beautified at http://jsbeautifier.org/ and a few more comments 14-08-2013
0.9.4 Major improvement - only run updateLoop() when counter running to save processor
      This is important if you have multiple instances as each would consume processor 
      even when not running.
0.9.5 Added a Checkbox to Settings giving option to continue counting from paused. 
      Normal sequence on clicking is 'start -> pause -> reset' 
      In optional mode this changes to 'start -> pause -> continue -> pause etc'.
      In this mode one has to use th Right Click (Context) Menu to reset. 15-08-2013
0.9.6 Refinement of Tooltip text. 15-08-2013
0.9.6 Removed Simple from Title. Custom Icon in folder and icon line removed from metadata.json
      (alternative is line "icon": "appointment-new") and follow theme 17-08-2013
0.9.7 Major change to single counterStatus from a series of flags
0.9.8 counterStatus, currentCount and startTime are now stored as Settings variables
      so the counter is not reset by a cinnamon reset.
0.9.9 New variable pauseAt added and replaces currentCount in Settings to reduce the load on Settings 
      as it is updated only at time of counter being paused.
      Changed to call a null function when a generic setting changed rather than a UI update. 25-08-2013
1.0.0 Initial version on Cinnamon Spices web site 01-09-2013
1.1.0 Quick fix to background colours to use transparency so they work with light and dark themes 02-09-2013
1.1.1 Added radiused border to background colours and made them configurable via a stylesheet 
      (stylesheet.css in the applet folder). Extra menu item added to open stylesheet.css 04-09-2013
1.1.2 Took opportunity to change from red background when days greater than 1 to a red border
      so one still knows if it is paused or counting  
*/