// ============================================================================
// Coderloader Zip Program
// Programmed by Francois Lamini
// ============================================================================
var child_process = require("child_process");
var path = require("path");
var fs = require("fs");

var $root = __dirname;
var $files = [];

/**
 * Runs a command or tries to.
 * @param command The command to run.
 * @param params The command's parameters.
 * @param folder The working folder for the command.
 * @param on_exit Called with a flag that tells if there is an error or not. A message is also passed in.
 * @param on_error Called when there is an error. A message is passed in.
 */
function Run_Command(command, params, folder, on_exit, on_error) {
  var cmd = child_process.spawn(command, params, {
    cwd: path.join($root, Escape_Path(folder))
  });
  var message = "";
  var has_error = false;
  cmd.stdout.on("data", function(chunk) {
    message += chunk;
  });
  cmd.stderr.on("data", function(chunk) {
    message += chunk;
  });
  cmd.on("close", function(code) {
    on_exit(has_error, message);
  });
  cmd.on("error", function(error) {
    has_error = true;
    on_error(message);
  });
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
 * Selects a list of files from a pattern.
 * @param pattern The pattern to select the files with.
 * @param folder The project to select the files from.
 */
function Select_Files(pattern, folder) {
  try {
    var files = fs.readdirSync(path.join($root, folder), "utf8");
    var file_count = files.length;
    var terms = pattern.split(/\s+/);
    var exp = new RegExp(terms.join("|"), "i");
    for (var file_index = 0; file_index < file_count; file_index++) {
      var file = files[file_index];
      // Do not match directories.
      var stats = fs.statSync(path.join($root, folder, file));
      if (!stats.isDirectory()) {
        if (file.match(exp)) {
          $files.push(file);
        }
      }
    }
  }
  catch (error) {
    Debug("Files", error.toString());
  }
}

/**
 *  Escapes a folder path to platform independent path separators.
 * @param folder The folder path.
 * @return The path that is platform independent.
 */
function Escape_Path(folder) {
  return folder.replace(/(\/|\\|:)/g, path.sep);
}

/**
 * Initializes the zip program.
 */
function Init() {
  if (process.argv.length >= 5) {
    var command = process.argv[2];
    var archive = process.argv[3];
    var folder = Escape_Path(process.argv[4]);
    if (command == "zip") {
      if (process.argv.length == 6) {
        var pattern = process.argv[5].replace(/\\s/g, " ");
        Debug("pattern", pattern);
        Select_Files(pattern, folder);
        // Delete the old archive.
        try {
          var params = [ archive ];
          fs.unlinkSync(path.join($root, folder, archive));
        }
        catch (error) {
          Debug("zip", error.toString());
        }
        // Now run the zip command.
        Run_Command("zip", params.concat($files), folder, function(message) {
          // Debug("zip", message);
        }, function(message) {
          Debug("zip", message);
        });
      }
      else {
        Debug("zip", "Pattern not passed in.");
      }
    }
    else if (command == "unzip") {
      Run_Command("unzip", [ "-o", archive ], folder, function(message) {
        try {
          // Delete the archive.
          fs.unlinkSync(path.join($root, folder, archive));
          Debug("unzip", message);
        }
        catch (error) {
          Debug(archive, "Could not delete.");
        }
      }, function(message) {
        Debug("unzip", message);
      });
    }
    else {
      Debug("Zip", 'Possible commands are "zip" and "unzip".');
    }
  }
  else {
    Debug("Zip", "Usage: " + process.argv[1] + " <command> <archive> <project>");
  }
}

// **************** Constructor *****************
Init();
// **********************************************