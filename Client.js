// ============================================================================
// Codeloader Client Browser Script
// Programmed by Francois Lamini
// ============================================================================
var fs = require("fs");
var child_process = require("child_process");
var path = require("path");
var http = require("http");

var $config = {};
var $root = __dirname;
var $sel_browser = -1;
var $os = process.platform;
var $menu = [];
var $browsers = {
  "win32": [
    {
      name: "chrome.exe",
      app: [ "--start-maximized", "--new-window", "--app=%url%" ],
      fullscreen: [ "--kiosk", "--new-window", "%url%" ],
      path: path.join("C:", "Program Files", "Google", "Chrome", "Application")
    },
    {
      name: "firefox.exe",
      app: [ "--start-maximized", "--new-window", "%url%" ],
      fullscreen: [ "--kiosk", "--new-window", "%url%" ],
      path: path.join("C:", "Program Files (x86)", "Mozilla Firefox")
    }
  ],
  "linux": [
    {
      name: "firefox",
      app: [ "--start-maximized", "--new-window", "%url%" ],
      fullscreen: [ "--kiosk", "--new-window", "%url%" ],
      path: path.sep + path.join("usr", "bin")
    },
    {
      name: "google-chrome",
      app: [ "--start-maximized", "--new-window", "--app=%url%" ],
      fullscreen: [ "--kiosk", "--new-window", "%url%" ],
      path: path.sep + path.join("opt", "google", "chrome")
    },
    {
      name: "chromium-browser",
      app: [ "--start-maximized", "--new-window", "--app=%url%" ],
      fullscreen: [ "--kiosk", "--new-window", "%url%" ],
      path: path.sep + path.join("usr", "bin")
    },
    {
      name: "chromium",
      app: [ "--start-maximized", "--new-window", "--app=%url%" ],
      fullscreen: [ "--kiosk", "--new-window", "%url%" ],
      path: path.sep + path.join("usr", "bin")
    }
  ]
};

/**
 * Loads a config file and populates the config hash.
 * @param name The name of the config file.
 */
function Load_Config(name) {
  try {
    var data = fs.readFileSync(path.join($root, name), "utf8");
    var records = Split(data);
    var rec_count = records.length;
    for (var rec_index = 0; rec_index < rec_count; rec_index++) {
      var record = records[rec_index];
      if (record.match(/^\w+=.+$/)) {
        var pair = record.split(/=/);
        var key = pair[0];
        var value = isNaN(pair[1]) ? pair[1] : parseInt(pair[1]);
        $config[key] = value;
      }
    }
  }
  catch (error) {
    Debug("Config", "Config Error: " + error.message);
  }
}

/**
 * Splits data into platform independent lines.
 * @param data The data string to split.
 * @return An array of lines without blanks.
 */
function Split(data) {
  var lines = data.split(/\r\n|\r|\n/);
  // Remove any carrage return at the end.
  var line_count = lines.length;
  var blanks = 0;
  for (var line_index = line_count - 1; line_index >= 0; line_index--) { // Start from back.
    var line = lines[line_index];
    if (line.length == 0) {
      blanks++;
    }
    else {
      break;
    }
  }
  return lines.slice(0, line_count - blanks);
}

/**
 * Creates a new window for the specified applet url.
 * @param url The url of the window to create.
 * @param on_create Called when the window is created.
 */
function Create_Window(url, on_create) {
  Check_Site(url, function() {
    var browser = $browsers[$os][$sel_browser];
    var params = ($config["fullscreen"] == "on") ? browser.fullscreen : browser.app;
    var exe = path.join(browser.path, browser.name);
    Run_Command(exe, params, { "url": url }, function(has_error) {
      if (!has_error) {
        Debug(browser.name, "Window closed!");
      }
    }, function() {
      Debug(browser.name, "Error!");
    });
    setTimeout(on_create, 10);
  }, function() {
    console.log("Could not access site: " + url);
  });
}

/**
 * Runs a command or tries to.
 * @param command The command to run.
 * @param params The command's parameters.
 * @param vars The replacement variables. This is a hash with key being variable name.
 * @param on_exit Called with a flag that tells if there is an error or not.
 * @param on_error Called when there is an error.
 */
function Run_Command(command, params, vars, on_exit, on_error) {
  var new_params = params.slice(0);
  // Replace all parameters with placeholders if applicable.
  var param_count = params.length;
  for (var name in vars) {
    var value = vars[name];
    for (var param_index = 0; param_index < param_count; param_index++) {
      var param = params[param_index];
      new_params[param_index] = param.replace(new RegExp("%" + name + "%", "g"), value);
    }
  }
  var cmd = child_process.spawn(command, new_params, {
    cwd: $root
  });
  var has_error = false;
  cmd.on("close", function(code) {
    on_exit(has_error);
  });
  cmd.on("error", function(error) {
    has_error = true;
    on_error();
  });
}

/**
 * Checks a single browser to see if it is installed.
 * @param index The index of the browser to check.
 * @param on_done Called when the browser check is done.
 * @param on_error Called if there was no browser supported.
 */
function Check_Browser(index, on_done, on_error) {
  var browsers = $browsers[$os];
  if (browsers) {
    if (index < browsers.length) {
      var browser = browsers[index];
      try {
        var exe = path.join(browser.path, browser.name);
        if (fs.existsSync(exe)) {
          if ($config["browser"]) {
            if (browser.name.indexOf($config["browser"]) != -1) { // We take browser preference!
              $sel_browser = index;
              on_done();
            }
            else {
              Check_Browser(index + 1, on_done, on_error);
            }
          }
          else {
            $sel_browser = index;
            on_done();
          }
        }
        else {
          Check_Browser(index + 1, on_done, on_error);
        }
      }
      catch (error) {
        $sel_browser = -1;
        on_error();
      }
    }
    else { // No browsers found!
      $sel_browser = -1;
      on_error();
    }
  }
  else {
    $sel_browser = -1;
    on_error();
  }
}

/**
 * Writes a message to the console.
 * @param tag The tag to pin on the message.
 * @param message The error message.
 */
function Debug(tag, message) {
  console.log(tag + ": " + message);
}

/**
 * Checks a site to see if it is accessible.
 * @param url The url of the site.
 * @param on_load Called if the site can be loaded.
 * @param on_error Called if the site could not be loaded.
 */
function Check_Site(url, on_load, on_error) {
  http.get(url, function(response) {
    response.setEncoding("utf8");
    if (response.statusCode == 200) {
      response.resume(); // Free up memory.
      on_load();
    }
    else {
      response.resume();
      on_error();
    }
  }).on("error", function() {
    on_error();
  });
}

/**
 * Loads a site given the index.
 * @param sites The list of sites.
 * @param index The index of the site to load.
 */
function Load_Site(sites, index) {
  if (index < sites.length) {
    var site = sites[index];
    if ($config[site]) {
      var url = $config[site];
      Create_Window(url, function() {
        Load_Site(sites, index + 1);
      });
    }
  }
}

/**
 * Initializes the app.
 */
function Init() {
  if (process.argv.length == 3) {
    var config_file = process.argv[2];
    Load_Config(config_file);
    Check_Browser(0, function() {
      if ($config["open"]) {
        var sites = $config["open"].split(/,/);
        Load_Site(sites, 0);
      }
      else {
        Debug("No sites to open.");
      }
    }, function() {
      Debug("Browser", "You do not have a supported browser!");
    });
  }
  else {
    Debug("Client", "Usage: " + process.argv[1] + " <config-file>");
  }
}

// **************** Constructor *****************
Init();
// **********************************************
