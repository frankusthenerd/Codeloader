// ============================================================================
// Codeloader Website
// Programmed by Francois Lamini
// ============================================================================

const CELL_W = 16;
const CELL_H =  32;
var $grid = null;
var $grid_w = 0;
var $grid_h = 0;
var $screen_w = 0;
var $screen_h = 0;
var $entities = [];
var $properties = {};
var $components = [];
var $timer = null;
var $pages = {};
var $current_page = "";
var $home_page = "";
var $user_mode = "visitor";
var $http = "http://";
var $browser = {
  name: "",
  ip: "",
  port: 0
};
var $nav_condition = function() {
  return true;
};

/**
 * Grabs all elements by ID and creates global references to them. These archive
 * formatted with #$$element$$#.
 */
function Map_Element_Ids() {
  var tags = document.getElementsByTagName("*");
  var tag_count = tags.length;
  for (var tag_index = 0; tag_index < tag_count; tag_index++) {
    var tag = tags[tag_index];
    if (tag.hasAttribute("id")) {
      var id = tag.getAttribute("id");
      window["$" + id + "$"] = tag;
    }
  }
}

/**
 * Creates page containers given that the $$page hash is populated.
 */
function Create_Page_Containers() {
  for (var name in $pages) {
    var container_id = $pages[name].container;
    var container = document.createElement("div");
    container.setAttribute("class", "container");
    container.setAttribute("id", container_id);
    document.body.appendChild(container);
  }
}

/**
 * Remaps the IDs of the pages to containers.
 */
function Remap_Page_Ids() {
  for (var name in $pages) {
    var container_id = $pages[name].container;
    $pages[name].container = window["$" + container_id + "$"];
  }
}

/**
 * Initializes the global parse grid.
 * @param viewport_w The width of the viewport in pixels.
 * @param viewport_h The height of the viewport in pixels.
 */
function Init_Grid(viewport_w, viewport_h) {
  $screen_w = viewport_w;
  $screen_h = viewport_h;
  $grid_w = Math.floor(viewport_w / CELL_W);
  $grid_h = Math.floor(viewport_h / CELL_H);
  $grid = [];
  for (var cell_y = 0; cell_y < $grid_h; cell_y++) {
    var row = [];
    for (var cell_x = 0; cell_x < $grid_w; cell_x++) {
      row.push("");
    }
    $grid.push(row);
  }
}

/**
 * Clears out the grid.
 */
function Clear_Grid() {
  for (var cell_y = 0; cell_y < $grid_h; cell_y++) {
    for (var cell_x = 0; cell_x < $grid_w; cell_x++) {
      $grid[cell_y][cell_x] = "";
    }
  }
}

/**
 * Maps the grid out. This is used for debugging purposes to actually output
 * the grid itself.
 */
function Map_Grid() {
  var $grid_str = "";
  for (var cell_y = 0; cell_y < $grid_h; cell_y++) {
    for (var cell_x = 0; cell_x < $grid_w; cell_x++) {
      var cell = $grid[cell_y][cell_x];
      $grid_str += String(cell);
    }
    $grid_str += "<br />";
  }
  return $grid_str;
}

/**
 * Parses the grid given the layout text.
 * @param text The text containing the layout.
 */
function Parse_Grid(text) {
  var lines = text.split(/\r\n|\r|\n/);
  var line_count = (lines.length > $grid_h) ? $grid_h : lines.length;
  for (var line_index = 0; line_index < line_count; line_index++) {
    var line = lines[line_index];
    var char_count = (line.length > $grid_w) ? $grid_w : line.length;
    for (var char_index = 0; char_index < char_count; char_index++) {
      var ch = line.charAt(char_index);
      $grid[line_index][char_index] = ch;
    }
  }
}

/**
 * Parses the markdown stored in the grid.
 * @param text The text containing the layout markdown.
 * @param container The container to render the entities to.
 */
function Parse_Markdown(text, container) {
  try {
    var html = [];
    $entities = [];
    // Parse the properties.
    text = Parse_Properties(text);
    // Now parse the grid.
    Parse_Grid(text);
    // Parse the entities.
    while (Has_Entity()) {
      var entity = Parse_Entity();
      $entities.push(entity);
      // html.push(Show_Object(entity));
    }
    // html.push(Show_Properties());
    // $markdown_output$.innerHTML = html.join('<br />');
    Render_Entities(container);
  }
  catch (error) {
    container.innerHTML = "Error: " + error.toString();
  }
}

/**
 * Determines if there is an entity still on the grid.
 */
function Has_Entity() {
  var has_entity = false;
  for (var cell_y = 0; cell_y < $grid_h; cell_y++) {
    for (var cell_x = 0; cell_x < $grid_w; cell_x++) {
      var cell = $grid[cell_y][cell_x];
      if (cell.match(/\[|\{|\(|\+/)) { // Entity identifier.
        has_entity = true;
        break;
      }
    }
  }
  return has_entity;
}

/**
 * Parses one entity from the grid and removes it. This entity is turned into
 * a component and a reference is generated with the name $$component.
 */
function Parse_Entity() {
  var entity = {
    id: "",
    type: "",
    x: 0,
    y: 0,
    width: 0,
    height: 0
  };
  for (var cell_y = 0; cell_y < $grid_h; cell_y++) {
    for (var cell_x = 0; cell_x < $grid_w; cell_x++) {
      var cell = $grid[cell_y][cell_x];
      if (cell == '+') {
        entity.x = cell_x;
        entity.y = cell_y;
        entity.width = 1;
        entity.height = 1;
        entity.type = "box";
        Parse_Box(entity);
        // Break out of double loop.
        cell_y = $grid_h;
        break;
      }
      else if (cell == '[') {
        entity.x = cell_x;
        entity.y = cell_y;
        entity.width = 1;
        entity.height = 1;
        entity.type = "field";
        Parse_Field(entity);
        // Break out of double loop.
        cell_y = $grid_h;
        break;
      }
      else if (cell == '{') {
        entity.x = cell_x;
        entity.y = cell_y;
        entity.width = 1;
        entity.height = 1;
        entity.type = "panel";
        Parse_Panel(entity);
        // Break out of double loop.
        cell_y = $grid_h;
        break;
      }
      else if (cell == '(') {
        entity.x = cell_x;
        entity.y = cell_y;
        entity.width = 1;
        entity.height = 1;
        entity.type = "button";
        Parse_Button(entity);
        // Break out of double loop.
        cell_y = $grid_h;
        break;
      }
      else {
        continue; // Ignore but allow looking for other $entities.
      }
    }
  }
  return entity;
}

/**
 * Parses a box entity.
 * @param entity The entity which is being parsed. This will fill in with data.
 * @throws String If any error was encountered during the parse.
 */
function Parse_Box(entity) {
  // We'll navigate in this path: right -> down -> left -> up
  var pos_x = entity.x; // Skip the plus.
  var pos_y = entity.y;
  var rev_width = 1;
  var rev_height = 1;
  var id_str = "";
  // Clear out first plus.
  $grid[pos_y][pos_x] = "";
  // Navigate right.
  pos_x++;
  while (pos_x < $grid_w) {
    var cell = $grid[pos_y][pos_x];
    if (cell == '+') {
      entity.width++;
      entity.id = id_str.replace(/\-/g, "");
      $grid[pos_y][pos_x] = "";
      break;
    }
    else if (cell.match(/\-|\w/)) { // Box Edge
      id_str += cell;
      entity.width++;
      $grid[pos_y][pos_x] = "";
    }
    else {
      throw "Not a valid box. (right)";
    }
    pos_x++;
  }
  // Check for truncated object.
  if (pos_x == $grid_w) {
    throw "Truncated box. (width)";
  }
  // Navigate down.
  pos_y++; // Skip the first plus.
  while (pos_y < $grid_h) {
    var cell = $grid[pos_y][pos_x];
    if (cell == '+') {
      entity.height++;
      $grid[pos_y][pos_x] = "";
      break;
    }
    else if (cell == '|') {
      entity.height++;
      $grid[pos_y][pos_x] = "";
    }
    else {
      throw "Not a valid box. (down)";
    }
    pos_y++;
  }
  // Check for truncated object.
  if (pos_y == $grid_h) {
    throw "Truncated box. (height)";
  }
  // Navigate left.
  pos_x--; // Skip that first plus.
  while (pos_x >= 0) {
    var cell = $grid[pos_y][pos_x];
    if (cell == '+') {
      rev_width++;
      $grid[pos_y][pos_x] = "";
      break;
    }
    else if (cell == '-') {
      rev_width++;
      $grid[pos_y][pos_x] = "";
    }
    else {
      throw "Not a valid box. (left)";
    }
    pos_x--;
  }
  if (rev_width != entity.width) {
    throw "Not a valid box. (width mismatch)";
  }
  // Navigate up.
  pos_y--;
  while (pos_y >= 0) {
    var cell = $grid[pos_y][pos_x];
    if (cell == '') { // Plus was removed but validated before.
      rev_height++;
      $grid[pos_y][pos_x] = "";
      break;
    }
    else if (cell == '|') {
      rev_height++;
      $grid[pos_y][pos_x] = "";
    }
    else {
      throw "Not a valid box. (up)";
    }
    pos_y--;
  }
  if (rev_height != entity.height) {
    throw "Not a valid box. (height mismatch)";
  }
}

/**
 * Parses a field entity.
 * @param entity The entity which is being parsed. This will fill in with data.
 * @throws String If any error was encountered during the parse.
 */
function Parse_Field(entity) {
  var pos_x = entity.x;
  var pos_y = entity.y;
  var id_str = "";
  // Clear out initial bracket.
  $grid[pos_y][pos_x] = "";
  // Parse out field.
  pos_x++; // Pass over initial bracket.
  while (pos_x < $grid_w) {
    var cell = $grid[pos_y][pos_x];
    if (cell == ']') {
      entity.width++;
      entity.id = id_str.replace(/\s/g, "");
      $grid[pos_y][pos_x] = "";
      break;
    }
    else if (cell.match(/\w|\s/)) {
      id_str += cell;
      entity.width++;
      $grid[pos_y][pos_x] = "";
    }
    else {
      throw "Not a valid field.";
    }
    pos_x++;
  }
  // Check for truncated object.
  if (pos_x == $grid_w) {
    throw "Truncated field.";
  }
}

/**
 * Parses a panel entity.
 * @param entity The entity which is being parsed. This will fill in with data.
 * @throws String If any error was encountered during the parse.
 */
function Parse_Panel(entity) {
  var pos_x = entity.x;
  var pos_y = entity.y;
  var id_str = "";
  // Clear out initial curly.
  $grid[pos_y][pos_x] = "";
  // Skip over initial curly.
  pos_x++;
  // Go ahead and parse the rest.
  while (pos_x < $grid_w) {
    var cell = $grid[pos_y][pos_x];
    if (cell == '}') {
      entity.width++;
      entity.id = id_str.replace(/\s/g, "");
      $grid[pos_y][pos_x] = "";
      break;
    }
    else if (cell.match(/\w|\s/)) {
      id_str += cell;
      entity.width++;
      $grid[pos_y][pos_x] = "";
    }
    else {
      throw "Not a valid panel.";
    }
    pos_x++;
  }
  // Check for truncated object.
  if (pos_x == $grid_w) {
    throw "Truncated panel.";
  }
}

/**
 * This parses the button entity.
 * @param entity The entity which is being parsed. This will fill in with data.
 * @throws String If any error was encountered during the parse.
 */
function Parse_Button(entity) {
  var pos_x = entity.x;
  var pos_y = entity.y;
  var id_str = "";
  $grid[pos_y][pos_x] = "";
  pos_x++;
  while (pos_x < $grid_w) {
    var cell = $grid[pos_y][pos_x];
    if (cell == ')') {
      entity.width++;
      entity.id = id_str.replace(/\s/g, "");
      $grid[pos_y][pos_x] = "";
      break;
    }
    else if (cell.match(/\w|\s/)) {
      id_str += cell;
      entity.width++;
      $grid[pos_y][pos_x] = "";
    }
    else {
      throw "Not a valid button.";
    }
    pos_x++;
  }
  // Check for truncated object.
  if (pos_x == $grid_w) {
    throw "Truncated button.";
  }
}

/**
 * This shows an object property by property.
 * @param object The object to debug.
 */
function Show_Object(object) {
  var html = [];
  for (var property in object) {
    html.push('<b>' + property + ':</b> ' + object[property]);
  }
  return html.join('<br />') + '<br />';
}

/**
 * Parses all properties related to entities.
 * @param text The text to parse into properties.
 * @throws String If the property is not formatted correctly.
 */
function Parse_Properties(text) {
  var lines = text.split(/\r\n|\r|\n/);
  var line_count = lines.length;
  var new_lines = [];
  for (var line_index = 0; line_index < line_count; line_index++) {
    var line = lines[line_index];
    if (line.match(/\w+\s*\->/)) { // Property signature.
      var record = line.trim();
      var pair = record.split(/\s*\->\s*/);
      if (pair.length == 2) {
        var entity_id = pair[0];
        var value = pair[1];
        // Create entity property object.
        $properties[entity_id] = {};
        var props = value.split(/\s*,\s*/);
        var prop_count = props.length;
        for (var prop_index = 0; prop_index < prop_count; prop_index++) {
          var prop = props[prop_index].split(/\s*=\s*/);
          if (prop.length == 2) {
            var name = prop[0];
            var value = prop[1];
            $properties[entity_id][name] = value;
          }
          else {
            throw "Property is missing value.";
          }
        }
      }
      else {
        throw "Entity ID is missing $properties.";
      }
    }
    else { // We're not including property lines.
      new_lines.push(line);
    }
  }
  return new_lines.join("\n");
}

/**
 * Shows all of the properties that were parsed. This is for debugging purposes.
 */
function Show_Properties() {
  var html = [];
  for (var entity in $properties) {
    html.push('<b>' + entity + '</b>');
    var props = $properties[entity];
    for (var prop in props) {
      var value = props[prop];
      html.push('&nbsp;&nbsp;' + prop + '=' + value);
    }
    html.push("");
  }
  return html.join('<br />');
}

/**
 * Renders all of the entities as components.
 * @param container The container to render the entities to.
 */
function Render_Entities(container) {
  $components = [];
  container.innerHTML = "";
  var entity_count = $entities.length;
  for (var entity_index = 0; entity_index < entity_count; entity_index++) {
    var entity = $entities[entity_index];
    var settings = $properties[entity.id] || {};
    entity.x *= CELL_W;
    entity.y *= CELL_H;
    entity.width *= CELL_W;
    entity.height *= CELL_H;
    var component = null;
    // We can override the entity type in the settings.
    if (settings["change-type"] != undefined) {
      entity.type = settings["change-type"];
    }
    if (entity.type == "box") {
      component = new cBox(entity, settings, container);
    }
    else if (entity.type == "field") {
      component = new cField(entity, settings, container);
    }
    else if (entity.type == "panel") {
      component = new cPanel(entity, settings, container);
    }
    else if (entity.type == "button") {
      component = new cButton(entity, settings, container)
    }
    else if (entity.type == "select") {
      component = new cSelect(entity, settings, container);
    }
    else if (entity.type == "edit") {
      component = new cEdit(entity, settings, container);
    }
    else if (entity.type == "checkbox") {
      component = new cCheckbox(entity, settings, container);
    }
    else if (entity.type == "radio") {
      component = new cRadio(entity, settings, container);
    }
    else if (entity.type == "wiki") {
      component = new cWiki(entity, settings, container);
    }
    else if (entity.type == "picture") {
      component = new cPicture(entity, settings, container);
    }
    else if (entity.type == "menu") {
      component = new cMenu(entity, settings, container);
    }
    else if (entity.type == "toolbar") {
      component = new cToolbar(entity, settings, container);
    }
    else if (entity.type == "image-button") {
      component = new cImage_Button(entity, settings, container);
    }
    else if (entity.type == "label") {
      component = new cLabel(entity, settings, container);
    }
    else if (entity.type == "marquee") {
      component = new cMarquee(entity, settings, container);
    }
    else if (entity.type == "tool-palette") {
      component = new cTool_Palette(entity, settings, container);
    }
    else if (entity.type == "grid-view") {
      component = new cGrid_View(entity, settings, container);
    }
    else if (entity.type == "comic-reader") {
      component = new cComic_Reader(entity, settings, container);
    }
    else if (entity.type == "code-editor") {
      component = new cCode_Editor(entity, settings, container);
    }
    else if (entity.type == "frame") {
      component = new cFrame(entity, settings, container);
    }
    else if (entity.type == "bump-map-editor") {
      component = new cBump_Map_Editor(entity, settings, container);
    }
    else if (entity.type == "sound-editor") {
      component = new cSound_Editor(entity, settings, container);
    }
    else if (entity.type == "board") {
      component = new cBoard(entity, settings, container);
    }
    else if (entity.type == "chat") {
      component = new cChat(entity, settings, container);
    }
    else if (entity.type == "screen") {
      component = new cScreen(entity, settings, container);
    }
    else if (entity.type == "uploader") {
      component = new cUploader(entity, settings, container);
    }
    else if (entity.type == "poll") {
      component = new cPoll(entity, settings, container);
    }
    else if (entity.type == "counter") {
      component = new cCounter(entity, settings, container);
    }
    else if (entity.type == "visitor-chart") {
      component = new cVisitor_Chart(entity, settings, container);
    }
    else {
      throw String("Wrong entity type: " + entity.type);
    }
    $components.push(component);
  }
}

/**
 * Loads a file from the server. Note that some files are not accessible.
 * @param file The name of the file to load.
 * @param on_load The callback when the file is loaded. The data is passed in.
 * @param on_error The error callback. The error message is passed in. If not defined then the error is logged.
 */
function Load_File(file, on_load, on_error) {
  var ajax = new XMLHttpRequest();
  ajax.onreadystatechange = function() {
    if (ajax.readyState == 4) {
      if (ajax.status == 200) {
        var data = ajax.responseText;
        on_load(data);
      }
      else if (ajax.status == 404) {
        if (on_error) {
          on_error(ajax.responseText);
        }
        else {
          console.log(ajax.responseText);
        }
      }
      else if (ajax.status == 401) {
        if (on_error) {
          on_error(ajax.responseText);
        }
        else {
          console.log(ajax.responseText);
        }
      }
    }
  };
  ajax.open("GET", file, true);
  ajax.send(null);
}

/**
 * Saves a file to the server. You need a code to be able to do this.
 * @param file The file to save.
 * @param data The data to place in the file.
 * @param on_save The handler called when the file is saved. It takes a message. This is optional.
 * @param on_error Called when the file was not saved. It takes a message. This is optional.
 */
function Save_File(file, data, on_save, on_error) {
  var ajax = new XMLHttpRequest();
  ajax.onreadystatechange = function() {
    if (ajax.readyState == 4) {
      if (ajax.status == 200) {
        if (on_save) {
          on_save(ajax.responseText);
        }
        else {
          console.log(ajax.responseText);
        }
      }
      else if (ajax.status == 404) {
        if (on_error) {
          on_error(ajax.responseText);
        }
        else {
          console.log(ajax.responseText);
        }
      }
      else if (ajax.status == 401) {
        if (on_error) {
          on_error(ajax.responseText);
        }
        else {
          console.log(ajax.responseText);
        }
      }
    }
  };
  ajax.open("POST", file, true);
  ajax.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
  ajax.send("data=" + encodeURIComponent(data));
}

/**
 * Loads a layout from a file and renders it.
 * @param file The file to load the layout from.
 * @param on_load Called if the layout is parsed and rendered.
 */
function Load_Layout(file, container, on_load) {
  Load_File("Pages/" + file, function(text) {
    Parse_Markdown(text, container);
    on_load();
  }, function(error) {
    console.log("Error: " + error);
    on_load();
  });
}

/**
 * Loads a page in a list of pages.
 * @param index The index of the page to load.
 * @param on_load Called when all pages have been loaded.
 */
function Load_Page(index, on_load) {
  var names = Object.keys($pages);
  if (index < names.length) {
    var name = names[index];
    var page = $pages[name];
    var file = Is_Mobile() ? page.mobile : page.layout;
    if (file != undefined) {
      Load_Layout(file, page.container, function() {
        Load_Page(index + 1, on_load);
      });
    }
    else {
      Load_Page(index + 1, on_load);
    }
  }
  else {
    on_load();
  }
}

/**
 * Formats text according to Wiki format.
 * @param text The wiki text to format into HTML.
 * @return HTML generated from wiki text.
 */
function Format(text) {
  return text.replace(/&/g, "&amp;")
             .replace(/>/g, "&gt;")
             .replace(/</g, "&lt;")
             .replace(/\*{2}/g, "&ast;")
             .replace(/#{2}/g, "&num;")
             .replace(/@{2}/g, "&commat;")
             .replace(/\${2}/g, "&dollar;")
             .replace(/%{2}/g, "&percnt;")
             .replace(/\^{2}/g, "&Hat;")
             .replace(/\|{2}/g, "&vert;")
             .replace(/#([^#]+)#/g, "<b>$1</b>")
             .replace(/\*([^*]+)\*/g, "<i>$1</i>")
             .replace(/@([^@]+)@/g, "<h1>$1</h1>")
             .replace(/\$([^$]+)\$/g, "<h2>$1</h2>")
             .replace(/\^([^\^]+)\^/g, '<div class="table_head">$1</div>')
             .replace(/\|([^\|]+)\|/g, '<div class="table_data">$1</div>')
             .replace(/%([^%]+)%/g, "<code><pre>$1</pre></code>")
             .replace(/`([^`]+)`/g, "<!-- $1 -->")
             .replace(/(http:\/\/\S+|https:\/\/\S+)/g, '<a href="$1" target="_blank">$1</a>')
             .replace(/image:\/\/(\S+)/g, '<img src="Pictures/$1" />')
             .replace(/picture:\/\/(\S+)/g, '<img src="Upload/$1" />')
             .replace(/progress:\/\/(\d+)/g, '<div class="progress"><div class="percent_complete" style="width: $1%;">$1% Complete</div></div>')
             .replace(/video:\/\/(\S+)/g, '<iframe width="560" height="315" src="https://www.youtube.com/embed/$1" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>')
             .replace(/download:\/\/(\S+)/g, '<a href="Upload/$1">$1</a>')
             .replace(/\r\n|\r|\n/g, "<br />");
}

/**
 * Splits text into lines regardless of the line endings.
 * @param data The text to be split.
 * @return An array of string representing the lines.
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
 * Resizes a container according to the size of the browser window.
 * @param container The container to resize.
 */
function Resize_Container(container) {
  var width = document.body.clientWidth;
  var height = document.body.clientHeight;
  var scale_x = width / $screen_w;
  var scale_y = height / $screen_h;
  if ($browser.name == "firefox") {
    var scale_x = (width - 8) / $screen_w;
    var scale_y = (height - 8) / $screen_h;
  }
  if (height > $screen_h) {
    container.style.transformOrigin = "center center";
    container.style.transform = "scaleX(" + scale_y + ") scaleY(" + scale_y + ") translateZ(0)";
  }
}

/**
 * Resizes all page containers in accordance with the window size.
 */
function Resize_Page_Containers() {
  for (var name in $pages) {
    var container = $pages[name].container;
    Resize_Container(container);
  }
}

/**
 * Converts a string into hex format.
 * @param string The string to convert.
 * @return The hex string.
 */
function String_To_Hex(string) {
  var hex_str = "";
  var length = string.length;
  for (var ch_index = 0; ch_index < length; ch_index++) {
    var ch_value = string.charCodeAt(ch_index);
    var hex_value = ch_value.toString(16).toUpperCase();
    if (hex_value.length == 1) {
      hex_value = "0" + hex_value;
    }
    hex_str += hex_value;
  }
  return hex_str;
}

/**
 * Flips to a named page.
 * @param name The name of the page to flip to.
 */
function Flip_Page(name) {
  var result = $nav_condition();
  if (result) {
    if ($pages[name]) { // Does page exist?
      var container = $pages[name].container;
      // Post process current page before changing it.
      if ($current_page.length > 0) {
        var old_page_container = $pages[$current_page].container;
        old_page_container.style.display = "none";
        if ($pages[$current_page].pause) {
          $pages[$current_page].pause();
        }
      }
      else { // Hide all pages!
        for (var page in $pages) {
          var page_container = $pages[page].container;
          page_container.style.display = "none";
        }
      }
      // Display current page.
      $current_page = name;
      container.style.display = "block";
      if ($pages[name].resume) {
        $pages[name].resume();
      }
      // Set the hash of the page.
      location.hash = "#" + name;
      // Set home page.
      if ($home_page.length == 0) {
        $home_page = name;
      }
    }
  }
}

/**
 * Initializes the navigation handler to deal with browser navigation buttons.
 */
function Init_Navigation_Handler() {
  window.addEventListener("hashchange", function(event) {
    if (location.hash.length > 0) {
      var page = decodeURIComponent(location.hash.slice(1));
      if (page.length > 0) {
        Flip_Page(page);
      }
      else {
        Flip_Page($home_page);
      }
    }
    else {
      Flip_Page($home_page);
    }
  }, false);
}

/**
 * Detects the type of browser that is running the system. This populates the browser object.
 * @param on_success Called if the browser is successfull detected.
 * @param on_error Called if there was a problem detecting the browser. A parameter containing the error is passed in.
 */
function Detect_Browser(on_success, on_error) {
  var old_browser = false;
  var unknown_browser = false;
  var unsupported_browser = false;
  if (navigator.userAgent.match(/Android/)) { // Android
    $browser.name = "android";
    $browser.ip = location.hostname;
    $browser.port = location.port;
  }
  else if (navigator.userAgent.match(/Chrome\/\d+/)) { // Chrome
    var parts = navigator.userAgent.split(/\s+/);
    // Find pair.
    var part_count = parts.length;
    for (var part_index = 0; part_index < part_count; part_index++) {
      var part = parts[part_index];
      if (part.match(/Chrome/)) {
        var pair = part.split(/\//);
        var version = parseInt(pair[1]);
        if (version < 50) { // Older than 2016?
          old_browser = true;
        }
        break;
      }
    }
    $browser.name = "chrome";
    $browser.ip = location.hostname;
    $browser.port = location.port;
  }
  else if (navigator.userAgent.match(/Firefox\/\d+/)) { // Firefox
    var parts = navigator.userAgent.split(/\s+/);
    // Find pair.
    var part_count = parts.length;
    for (var part_index = 0; part_index < part_count; part_index++) {
      var part = parts[part_index];
      if (part.match(/Firefox/)) {
        var pair = part.split(/\//);
        var version = parseInt(pair[1]);
        if (version < 50) { // Older than 2016?
          old_browser = true;
        }
        break;
      }
    }
    $browser.name = "firefox";
    $browser.ip = location.hostname;
    $browser.port = location.port;
  }
  else { // Unknown browser.
    unknown_browser = true;
  }
  if (unknown_browser) {
    window.addEventListener("load", function() {
      on_error("browser-unknown");
    }, false);
  }
  else if (old_browser) {
    window.addEventListener("load", function() {
      on_error("browser-old");
    }, false);
  }
  else if (unsupported_browser) {
    window.addEventListener("load", function() {
      on_error("unsupported-browser");
    }, false);
  }
  else {
    // Wait for window to load first.
    window.addEventListener("load", function() {
      on_success();
    }, false);
  }
}

/**
 * Determines if a browser is mobile or not.
 * @return True if the browser is mobile, false otherwise.
 */
function Is_Mobile() {
  return (screen.width <= 450);
}

/**
 * Gets the image by name.
 * @param name The name of the image to fetch.
 * @param quote If true then url will be quoted with url() modifier.
 * @param folder The folder to get the image from. This is optional. Default is "Images".
 * @return The image URL string.
 */
function Get_Image(name, quote, folder) {
  if (folder == undefined) {
    folder = "Images";
  }
  var url = folder + "/" + name;
  if (quote) {
    url = 'url("' + url + '")';
  }
  return url;
}

/**
 * Parses the search portion of the URL.
 * @param url The URL to parse.
 * @return A hash of name/value pairs.
 */
function Parse_URL(url) {
  var params = {};
  var pairs = url.substr(1).split(/&/);
  var pair_count = pairs.length;
  for (var pair_index = 0; pair_index < pair_count; pair_index++) {
    var pair = pairs[pair_index].split(/=/);
    if (pair.length == 2) {
      var name = pair[0];
      var value = decodeURIComponent(pair[1]);
      params[name] = value;
    }
  }
  return params;
}

/**
 * Converts a string to hex.
 * @param string The string to convert.
 * @return A hex string.
 */
function String_To_Hex(string) {
  var hex_str = "";
  var length = string.length;
  for (var ch_index = 0; ch_index < length; ch_index++) {
    var ch_value = string.charCodeAt(ch_index);
    var hex_value = ch_value.toString(16).toUpperCase();
    if (hex_value.length == 1) {
      hex_value = "0" + hex_value;
    }
    hex_str += hex_value;
  }
  return hex_str;
}

/**
 * Converts hex to a string.
 * @param hex_str The hex string.
 * @return The restored string.
 */
function Hex_To_String(hex_str) {
  var string = "";
  var length = hex_str.length;
  for (var hex_index = 0; hex_index < length; hex_index += 2) {
    var hex_value = hex_str.substr(hex_index, 2);
    var ch_value = String.fromCharCode(parseInt(hex_value, 16));
    string += ch_value;
  }
  return string;
}

/**
 * Loads a cabinet file and returns a list of loaded file objects.
 * @param name The name of the cabinet file to load.
 * @param project The project where the cabinet file resides.
 * @param on_load Called when the cabinet is loaded. A list of files is passed in.
 */
function Load_Cabinet(name, project, on_load) {
  Load_File("Projects/" + project + "/" + name + ".cab", function(data) {
    var lines = Split(data);
    var files = [];
    while (lines.length > 0) {
      var fname = lines.shift();
      var file = {
        name: fname,
        lines: []
      };
      if (lines.length > 0) {
        var line_count = parseInt(lines.shift());
        for (var line_index = 0; line_index < line_count; line_index++) {
          if (lines.length > 0) {
            var line = lines.shift();
            file.lines.push(line);
          }
          else {
            console.log("Error: Missing file lines.");
            break;
          }
        }
      }
      else {
        console.log("Error: Missing line count.");
        break;
      }
      files.push(file);
    }
    on_load(files);
  });
}

/**
 * Saves a list of files to a cabinet file.
 * @param name The name of the cabinet file.
 * @param project The name of the project containing the cabinet.
 * @param files The list of files to save to the cabinet.
 * @param on_save Called when the cabinet has finished saving.
 */
function Save_Cabinet(name, project, files, on_save) {
  var lines = [];
  var file_count = files.length;
  for (var file_index = 0; file_index < file_count; file_index++) {
    var file = files[file_index];
    lines.push(file.name);
    lines.push(file.lines.length);
    for (var line_index = 0; line_index < line_count; line_index++) {
      var line = file.lines[line_index];
      lines.push(line);
    }
  }
  Save_File("Projects/" + project + "/" + name + ".cab", lines.join("\n"), function(message) {
    console.log(message);
    on_save();
  });
}

/**
 * Checks a condition to see if it passes otherwise an error is thrown.
 * @param condition The condition to check. 
 * @param error An error message for the condition fails.
 * @throws An error if the condition fails. 
 */
function Check_Condition(condition, error) {
  if (!condition) {
    throw error;
  }
}

/**
 * Parses an object from the lines.
 * @param lines The array of lines where the object resides.
 * @return An object.
 * @throws An error if the object is invalid.
 */
function Parse_Object(lines) {
  var object = {};
  var start = Parse_Line(lines);
  Check_Condition((start == "object"), "Missing object start keyword.");
  var token = "";
  while (token != "end") {
    token = Parse_Line(lines);
    if (token != "end") {
      var pair = token.split(/=/);
      Check_Condition((pair.length == 2), "Invalid name/value pair.");
      var name = pair[0];
      var value = isNaN(pair[1]) ? pair[1] : parseInt(pair[1]);
      object[name] = value;
    }
  }
  return object;
}

/**
 * Parses a single line from an array of lines.
 * @param lines The array of lines.
 * @return A single line.
 * @throws An error if there are no more lines. 
 */
function Parse_Line(lines) {
  var line = "";
  if (lines.length > 0) {
    line = lines.shift();
  }
  else {
    throw "No more lines.";
  }
  return line;
}

/**
 * Clears an object of all its properties.
 * @param object The object reference.
 */
function Clear_Object(object) {
  for (var property in object) {
    delete object[property];
  }
}

/**
 * This is the base component for all components.
 */
class cComponent {

  /**
   * Instantiates the component. Components are mapped to the global namespace
   * with #$$$$#. The following default properties exist:
   *
   * - change-type - This changes the type of component. Values can be:
   * -> "box"
   * -> "field"
   * -> "panel"
   * -> "button"
   * -> "select"
   * -> "edit"
   * -> "checkbox"
   * -> "radio"
   * -> "wiki"
   * -> "picture"
   * -> "menu"
   * -> "toolbar"
   * -> "image-button"
   * -> "label"
   * -> "marquee"
   * -> "tool-palette"
   * -> "grid-view"
   * -> "comic-reader"
   * -> "code-editor"
   * -> "frame"
   * -> "board"
   * -> "chat"
   * -> "poll"
   * -> "counter"
   * -> "visitor-chart"
   *
   * @param entity The parsed entity object.
   * @param settings The parsed settings hash.
   * @param container The container where the component will be added.
   */
  constructor(entity, settings, container) {
    this.entity = entity;
    this.settings = settings;
    this.container = container;
    this.elements = {};
    // Set the global reference to the object.
    window["$$" + this.entity.id] = this;
  }

  /**
   * This is where you create the component. You override this to process all
   * settings and create the layout associated with the entity.
   */
  Create() {
    // This is meant to be overridden.
  }

  /**
   * Creates an event on the component. This should be overridden per component.
   * @param name The name of the event, like "click".
   * @param handler The event handler. It is formatted like this:
   * %
   * function(component, event) {
   *
   * }
   * %
   */
  On(name, handler) {
    // This is meant to be overridden.
  }

  /**
   * Gets the value of the component.
   * @return The value of the component.
   */
  Get_Value() {
    return this.elements[this.entity.id].innerHTML;
  }

  /**
   * Sets the value of the component.
   * @param value The value to set the component to.
   */
  Set_Value(value) {
    this.elements[this.entity.id].innerHTML = value;
  }

  /**
   * Creates an element from a JSON tree and places it into a container.
   * Elements are formatted into a JSON object tree.
   * %
   *    {
   *      id: "container", // The ID of the element.
   *      type: "div", // The type of element tag.
   *      attrib: { // The element attributes.
   *        width: 100,
   *        height: 100
   *      },
   *      css: { // CSS properties.
   *        "position": "absolute",
   *        "background-color": "red"
   *      },
   *      subs: [ // All sub elements.
   *        {
   *          id: "area",
   *          type: "div"
   *        }
   *      ]
   *    }
   * %
   * @param element The JSON element tree.
   * @param container The container to attach the element tree. It can be a name.
   * @return A reference to the entire element tree.
   */
  Create_Element(element, container) {
    // First create the element.
    var object = document.createElement(element.type); // The tag type.
    // Set the attributes.
    if (element.attrib) {
      var keys = Object.keys(element.attrib);
      var key_count = keys.length;
      for (var key_index = 0; key_index < key_count; key_index++) {
        var attrib = keys[key_index];
        object.setAttribute(attrib, element.attrib[attrib]);
      }
    }
    // Set the style or CSS. self would overwrite template styles.
    if (element.css) {
      var keys = Object.keys(element.css);
      var key_count = keys.length;
      var style_str = "";
      for (var key_index = 0; key_index < key_count; key_index++) {
        var style = keys[key_index];
        var value = element.css[style];
        style_str += String(style + ": " + value + "; ");
      }
      object.setAttribute("style", style_str); // We want to allow conventional style strings.
    }
    // Store element reference.
    if (element.id) {
      this.elements[element.id] = object; // Reference.
      // Add in an ID property for object.
      object.codeloader_id = element.id;
      object.setAttribute("id", element.id); // Set and ID to identify in debugger.
    }
    // Set text inside of element.
    if (element.text) {
      object.innerHTML = Format(element.text);
    }
    // Parse all other sub elements.
    if (element.subs) {
      var sub_count = element.subs.length;
      for (var sub_index = 0; sub_index < sub_count; sub_index++) {
        var sub = element.subs[sub_index];
        var sub_ref = this.Create_Element(sub, object);
      }
    }
    // Install handler to prevent form submission.
    if (object.tagName == "INPUT") {
      object.addEventListener("keypress", function(event) {
        var key = event.keyCode;
        if (key == 13) { // Enter
          event.preventDefault();
        }
      }, false);
    }
    // Prevent tabbing away from text boxes.
    if (object.tagName == "TEXTAREA") {
      object.addEventListener("keydown", function(event) {
        var key = event.keyCode;
        if (key == 9) { // Tab
          event.preventDefault();
        }
      }, false);
    }
    // Do we add in the element to a container?
    if (typeof container == "string") {
      if (this.elements[container] != undefined) {
        this.elements[container].appendChild(object);
      }
    }
    else {
      container.appendChild(object);
    }
    // Very important! Return element reference.
    return object;
  }

  /**
   * Shows an element.
   * @param element The name of the element to be shown.
   */
  Show(element) {
    this.elements[element].style.display = "block";
  }

  /**
   * Hides an element.
   * @param element The name of the element to hide.
   */
  Hide(element) {
    this.elements[element].style.display = "none";
  }

  /**
   * Changes the color of an element.
   * @param element The name of the element to change the color.
   * @param color The color of the element.
   */
  Change_Color(element, color) {
    this.elements[element].style.backgroundColor = color;
  }

  /**
   * Capitalize the name and return a formatted version.
   * @param name The name to format.
   * @return The unformatted name.
   */
  Capitalize(name) {
    var words = name.split(/_/);
    var word_count = words.length;
    var title = [];
    for (var word_index = 0; word_index < word_count; word_index++) {
      var word = words[word_index];
      var first_letter = word.substr(0, 1).toUpperCase();
      var other = word.substr(1);
      title.push(first_letter + other);
    }
    return title.join(" ");
  }

  /**
   * Creates a button JSON element. The settings are as follows.
   *
   * - label - The text to display on the button.
   * - left - The left coordinate.
   * - top - The top coordinate.
   * - right - The right coordinate.
   * - bottom - The bottom coordinate.
   * - width - The width of the button.
   * - height - The height of the button.
   * - bg-color - The background color.
   * - fg-color - The foreground color.
   * - opacity - The opacity, ranges for 0 to 1.
   * - position - Can be "static", "absolute", or "relative".
   * - show - Can be "on" or "off".
   *
   * @param id The ID of the button.
   * @param settings Specifies the dimensions and style of the button.
   * @return The JSON structure of the button element.
   */
  Make_Button(id, settings) {
    var left = (settings["left"] != undefined) ? settings["left"] : "auto";
    var top = (settings["top"] != undefined) ? settings["top"] : "auto";
    var right = (settings["right"] != undefined) ? settings["right"] : "auto";
    var bottom = (settings["bottom"] != undefined) ? settings["bottom"] : "auto";
    return {
      id: id,
      type: "div",
      text: settings["label"],
      css: {
        "position": settings["position"] || "absolute",
        "left": (left != "auto") ? left + "px" : left,
        "top": (top != "auto") ? top + "px" : top,
        "right": (right != "auto") ? right + "px" : right,
        "bottom": (bottom != "auto") ? bottom + "px" : bottom,
        "width": settings["width"] + "px",
        "height": settings["height"] + "px",
        "border-radius": "5px",
        "background-color": settings["bg-color"] || "black",
        "color": settings["fg-color"] || "white",
        "opacity": settings["opacity"] || "1",
        "line-height": settings["height"] + "px",
        "text-align": "center",
        "cursor": String(Get_Image("Cursor.png", true) + ", default"),
        "font-family": "Regular, sans-serif",
        "font-size":  "16px",
        "font-weight": "bold"
      }
    };
  }

  /**
   * Creates an edit control. The settings are as follows:
   *
   * - label - The text to display on the edit control.
   * - value - The value that the edit control has.
   * - border - The border around the edit control.
   * - fg-color - The foreground color.
   * - bg-color - The background color.
   *
   * @param id The ID of the edit control.
   * @param settings The settings associated with the edit control.
   * @return The JSON structure of the edit control.
   */
  Make_Edit(id, settings) {
    return {
      id: id,
      type: "textarea",
      attrib: {
        nowrap: "",
        value: settings["value"] || "",
        placeholder: settings["label"] || ""
      },
      css: {
        "margin": "0",
        "margin-left": "1px",
        "margin-top": "1px",
        "padding": "2px",
        "border": settings["border"] || "1px solid silver",
        "width": "calc(100% - 8px)",
        "height": "calc(100% - 8px)",
        "resize": "none",
        "font-family": '"Courier New", monospace',
        "font-size": "16px",
        "color": settings["fg-color"] || "black",
        "background-color": settings["bg-color"] || "white"
      }
    };
  }

  /**
   * Creates a generic form with sub elements in it.
   * @param id The id of the form.
   * @param subs All of the sub elements of the form.
   * @return The form element JSON.
   */
  Make_Form(id, subs) {
    return {
      id: id,
      type: "form",
      attrib: {
        action: ""
      },
      css: {
        "position": "absolute",
        "margin": "0",
        "padding": "0",
        "left": "0",
        "top": "0",
        "width": "100%",
        "height": "100%"
      },
      subs: subs
    };
  }

  /**
   * Creates a generic field. The settings are as follows:
   *
   * - label - The default text to display.
   * - type - The type of field. i.e. "text", "password", etc.
   * - border - The border style.
   * - fg-color - The text color.
   * - bg-color - The color of the field.
   * - font - The font to use for the field.
   * - size - The size of the font.
   * - height - The height of the field. Pass it in if setting font size.
   * - object-width - The width of the object itself.
   * - object-height - The height of the object itself.
   * - value - The default value for the field.
   *
   * @param id The ID of the field.
   * @param settings The properties for the field.
   * @return The JSON structure for the field.
   */
  Make_Field(id, settings) {
    var font_size = settings["size"] || settings["height"];
    return {
      id: id,
      type: "input",
      attrib: {
        type: settings["type"] || "text",
        placeholder: settings["label"] || "",
        value: settings["value"] || ""
      },
      css: {
        "width": (settings["object-width"]) ? String("calc(" + settings["object-width"] + " - 8px)") : "calc(100% - 8px)",
        "height": (settings["object-height"]) ? String("calc(" + settings["object-height"] + "px - 8px)") : "calc(100% - 8px)",
        "padding": "2px",
        "margin": "0",
        "margin-left": "1px",
        "margin-top": "1px",
        "border": settings["border"] || "1px solid silver",
        "color": settings["fg-color"] || "black",
        "background-color": settings["bg-color"] || "white",
        "font-family": settings["font"] || "Regular, sans-serif",
        "font-size": (settings["height"] != undefined) ? String(font_size - 10) + "px" : font_size + "px"
      }
    };
  }

  /**
   * Creates a generic drop down list. The settings are as follows:
   *
   * - border - The border style.
   * - fg-color - The text color.
   * - bg-color - The color of the field.
   * - font - The font to use for the field.
   * - size - The size of the font.
   * - height - The height of the field. Pass it in if setting font size.
   * - object-width - The width of the object itself.
   * - object-height - The height of the object itself.
   *
   * @param id The ID of the field.
   * @param items An array of items representing the list.
   * @param settings The properties for the field.
   * @return The JSON structure for the field.
   */
  Make_Dropdown_List(id, items, settings) {
    var font_size = settings["size"] || settings["height"];
    var options = [];
    // Populate options.
    var item_count = items.length;
    for (var item_index = 0; item_index < item_count; item_index++) {
      var item = items[item_index];
      var option = {
        id: id + "_option_" + item_index,
        type: "option",
        text: item,
        attrib: {
          value: item
        }
      };
      options.push(option);
    }
    return {
      id: id,
      type: "select",
      attrib: {
        type: settings["type"] || "text",
        placeholder: settings["label"] || ""
      },
      css: {
        "width": (settings["object-width"]) ? String("calc(" + settings["object-width"] + " - 8px)") : "calc(100% - 8px)",
        "height": (settings["object-height"]) ? String("calc(" + settings["object-height"] + "px - 8px)") : "100%",
        "padding": "2px",
        "margin": "0",
        "margin-left": "1px",
        "margin-top": "1px",
        "border": settings["border"] || "1px solid silver",
        "color": settings["fg-color"] || "black",
        "background-color": settings["bg-color"] || "white",
        "font-family": settings["font"] || "Regular, sans-serif",
        "font-size": (settings["height"] != undefined) ? String(font_size - 10) + "px" : font_size + "px"
      },
      subs: options
    };
  }

  /**
   * Creates a radio selector group. The settings are as follows:
   *
   * float - Can be "left", "right", or "none".
   * width - The width of the radio selector.
   * clear - Whether to break floating. Can be "left", "right", "both", or "none".
   *
   * @param id The ID of the radio selector.
   * @param name The name of the radio selector.
   * @param items A hash of items with key/value pair as label/name.
   * @param settings The settings associated with the radio control.
   * @return A layout tree for the radio selector.
   */
  Make_Radio_Selector(id, name, items, settings) {
    var title = this.Capitalize(name);
    var radio_box = {
      id: id + "_radio_box",
      type: "form",
      attrib: {
        action: ""
      },
      css: {
        "margin": "0",
        "margin-bottom": "10px",
        "padding": "0",
        "position": "static",
        "height": "auto",
        "margin-top": "10px",
        "float": settings["float"] || "none",
        "width": settings["width"] || "auto",
        "clear": settings["clear"] || "none"
      },
      subs: [
        {
          id: id + "_radio_box_label",
          type: "div",
          text: "#" + title + "#",
          css: {
            "font-size": "18px",
            "margin-bottom": "4px"
          }
        }
      ]
    };
    var radio_buttons = [];
    for (var label in items) {
      var key = items[label];
      radio_box.subs.push({
        id: id + "_radio_button_" + key,
        type: "input",
        attrib: {
          type: "radio",
          name: name,
          value: key
        },
        css: {
          "margin": "0",
          "padding": "0",
          "width": "25px",
          "vertical-align": "middle",
          "height": "12px"
        }
      },
      {
        id: id + "_radio_label_" + key,
        type: "label",
        text: label,
        attrib: {
          "for": id + "_radio_button_" + key
        },
        css: {
          "font-size": "12px"
        }
      },
      {
        id: id + "_radio_break_" + key,
        type: "br"
      });
    }
    return radio_box;
  }

  /**
   * Creates a new checkbox board control. The following settings apply:
   *
   * float - Set to "left", "right", or "both".
   * clear - Set to "left", "right", "both", or "none".
   * width - The width of the control.
   *
   * @param id The id of the control.
   * @param name The name of the control.
   * @param items The items set up in key/value format with the key being the label and value being the name.
   * @param settings The settings hash to apply to the control.
   * @return The object dom tree for the control.
   */
  Make_Checkbox_Board(id, name, items, settings) {
    var title = this.Capitalize(name);
    var checkbox_board = {
      id: id + "_checkbox_board",
      type: "form",
      attrib: {
        action: ""
      },
      css: {
        "margin": "0",
        "margin-bottom": "10px",
        "padding": "0",
        "position": "static",
        "height": "auto",
        "margin-top": "10px",
        "float": settings["float"] || "none",
        "width": settings["width"] || "auto",
        "clear": settings["clear"] || "none"
      },
      subs: [
        {
          id: id + "_checkbox_board_label",
          type: "div",
          text: "#" + title + "#",
          css: {
            "font-size": "18px",
            "margin-bottom": "4px"
          }
        }
      ]
    };
    var radio_buttons = [];
    for (var label in items) {
      var key = items[label];
      checkbox_board.subs.push({
        id: id + "_checkbox_button_" + key,
        type: "input",
        attrib: {
          type: "checkbox",
          name: name,
          value: key
        },
        css: {
          "margin": "0",
          "padding": "0",
          "width": "25px",
          "vertical-align": "middle",
          "height": "12px"
        }
      },
      {
        id: id + "_checkbox_label_" + key,
        type: "label",
        text: label,
        attrib: {
          "for": id + "_checkbox_button_" + key
        },
        css: {
          "font-size": "12px"
        }
      },
      {
        id: id + "_checkbox_break_" + key,
        type: "br"
      });
    }
    return checkbox_board;
  }

  /**
   * Creates a loading sign.
   */
  Make_Loading_Sign() {
    return {
      id: this.entity.id + "_loading_sign",
      type: "div",
      css: {
        "position": "absolute",
        "left": "0",
        "top": "0",
        "right": "0",
        "bottom": "0",
        "margin": "auto",
        "width": "391px",
        "height": "83px",
        "background-image": Get_Image("Loading.png", true),
        "display": "none"
      }
    };
  }

  /**
   * Creates a saving sign.
   */
  Make_Saving_Sign() {
    return {
      id: this.entity.id + "_saving_sign",
      type: "div",
      css: {
        "position": "absolute",
        "left": "0",
        "top": "0",
        "right": "0",
        "bottom": "0",
        "margin": "auto",
        "width": "391px",
        "height": "83px",
        "background-image": Get_Image("Saving.png", true),
        "display": "none"
      }
    };
  }

  /**
   * Turns the loading sign on or off.
   * @param on If set to true then the sign appears, otherwise it doesn't.
   */
  Toggle_Loading_Sign(on) {
    this.elements[this.entity.id + "_loading_sign"].style.display = (on) ? "block" : "none";
  }

  /**
   * Turns the saving sign on or off.
   * @param on If set to true then the sign appears, otherwise it doesn't.
   */
  Toggle_Saving_Sign(on) {
    this.elements[this.entity.id + "_saving_sign"].style.display = (on) ? "block" : "none";
  }

  /**
   * Initializes the loading click handler.
   */
  Init_Loading_Click() {
    var component = this;
    this.elements[this.entity.id + "_loading_sign"].addEventListener("click", function(event) {
      component.elements[component.entity.id + "_loading_sign"].style.display = "none";
    }, false);
  }

  /**
   * Initializes the saving click handler.
   */
  Init_Saving_Click() {
    var component = this;
    this.elements[this.entity.id + "_saving_sign"].addEventListener("click", function(event) {
      component.elements[component.entity.id + "_saving_sign"].style.display = "none";
    }, false);
  }

  /**
   * Removes the elements and references allowing for garbage collection.
   * @param container The root container.
   */
  Remove_Elements(container) {
    while (container.childNodes.length > 0) {
      var item = container.childNodes[0];
      var id = item.id;
      // Remove child nodes of item, if any.
      this.Remove_Elements(item);
      container.removeChild(item);
      // Remove element reference for garbage collection.
      if (this.elements[id]) {
        delete this.elements[id];
      }
    }
  }

}

/**
 * A field component is a field on a form like a text input. The following
 * properties can be set:
 *
 * - type - The type of field. Like "password" or "text".
 * - label - The text displayed in the field by default.
 * - border - The border around the field.
 * - fg-color - The text color.
 * - bg-color - The background color.
 * - font - The font used.
 * - size - The size of the text.
 */
class cField extends cComponent {

  constructor(entity, settings, container) {
    super(entity, settings, container);
    this.Create();
  }

  Create() {
    var layout = this.Create_Element({
      id: this.entity.id,
      type: "form",
      attrib: {
        action: ""
      },
      css: {
        "margin": "0",
        "padding": "0",
        "border": "0",
        "position": "absolute",
        "left": this.entity.x + "px",
        "top": this.entity.y + "px",
        "width": this.entity.width + "px",
        "height": this.entity.height + "px"
      },
      subs: [
        {
          id: this.entity.id + "_field",
          type: "input",
          attrib: {
            type: this.settings["type"] || "text",
            placeholder: this.settings["label"] || ""
          },
          css: {
            "width": "calc(100% - 8px)",
            "height": "calc(100% - 8px)",
            "padding": "2px",
            "margin": "0",
            "margin-left": "1px",
            "margin-top": "1px",
            "border": this.settings["border"] || "1px solid silver",
            "color": this.settings["fg-color"] || "black",
            "background-color": this.settings["bg-color"] || "white",
            "font-family": this.settings["font"] || "Regular, sans-serif",
            "font-size": String(this.settings["size"] || (this.entity.height - 10)) + "px"
          }
        }
      ]
    }, this.container);
  }

  /**
   * Gets the value from a field.
   * @return The field value.
   */
  Get_Value() {
    return this.elements[this.entity.id + "_field"].value;
  }

  /**
   * Sets a field value.
   * @param value The value of the field to set.
   */
  Set_Value(value) {
    this.elements[this.entity.id + "_field"].value = value;
  }

}

/**
 * A panel is a small box where text can be displayed. The properties are:
 *
 * - label - The text to be displayed.
 * - fg-color - The text color.
 * - bg-color - The background color.
 * - font - The font used.
 * - size - The size of the text.
 * - align - How to align the text in the panel.
 */
class cPanel extends cComponent {

  constructor(entity, settings, container) {
    super(entity, settings, container);
    this.Create();
  }

  Create() {
    var padding = parseInt(this.settings["padding"]) || 2;
    var layout = this.Create_Element({
      id: this.entity.id,
      type: "div",
      text: this.settings["label"] || "",
      css: {
        "position": "absolute",
        "left": this.entity.x + "px",
        "top": this.entity.y + "px",
        "width": String(this.entity.width - (padding * 2)) + "px",
        "height": (this.entity.height - (padding * 2)) + "px",
        "background-color": this.settings["bg-color"] || "white",
        "color": this.settings["fg-color"] || "black",
        "font-family": this.settings["font"] || "Regular, sans-serif",
        "font-size": String(this.settings["size"] || 16) + "px",
        "line-height": String(this.entity.height - (padding * 2)) + "px",
        "text-align": this.settings["align"] || "left",
        "padding": padding + "px"
      }
    }, this.container);
  }

}

/**
 * A box is like a panel but can be sized in height. The properties are:
 *
 * - label - The text to be displayed.
 * - fg-color - The text color.
 * - bg-color - The background color.
 * - font - The font used.
 * - size - The size of the text.
 * - align - How to align the text in the panel.
 */
class cBox extends cComponent {

  constructor(entity, settings, container) {
    super(entity, settings, container);
    this.Create();
  }

  Create() {
    var center_vertical = (this.settings["center-vertical"] == "on") ? this.entity.height + "px" : "100%";
    var layout = this.Create_Element({
      id: this.entity.id,
      type: "div",
      text: this.settings["label"] || "",
      css: {
        "position": "absolute",
        "left": String(this.entity.x + 1) + "px",
        "top": String(this.entity.y + 1) + "px",
        "width": String(this.entity.width - 2) + "px",
        "height": String(this.entity.height - 2) + "px",
        "background-color": this.settings["bg-color"] || "white",
        "color": this.settings["fg-color"] || "black",
        "text-align": this.settings["align"] || "left",
        "line-height": center_vertical,
        "font-family": this.settings["font"] || "Regular, sans-serif",
        "font-size": String(this.settings["size"] || 16) + "px"
      }
    }, this.container);
  }

}

/**
 * This is a rectangular click button. The properties are:
 *
 * - fg-color - The color of the text.
 * - bg-color - The button color.
 * - label - The text to display on the button.
 */
class cButton extends cComponent {

  constructor(entity, settings, container) {
    super(entity, settings, container);
    this.Create();
  }

  Create() {
    var layout = this.Create_Element({
      id: this.entity.id,
      type: "div",
      text: this.settings["label"] || "",
      css: {
        "position": "absolute",
        "left": String(this.entity.x + 1) + "px",
        "top": String(this.entity.y + 1) + "px",
        "width": String(this.entity.width - 2) + "px",
        "height": String(this.entity.height - 2) + "px",
        "background-color": this.settings["bg-color"] || "blue",
        "color": this.settings["fg-color"] || "white",
        "font-weight": "bold",
        "text-align": "center",
        "line-height": this.entity.height + "px",
        "border-radius": "5px",
        "cursor": String(Get_Image("Cursor.png", true) + ", default"),
        "font-size": "16px",
        "font-family": "Regular, sans-serif"
      }
    }, this.container);
  }

  On(name, handler) {
    var component = this;
    this.elements[this.entity.id].addEventListener(name, function(event) {
      // Call handler here.
      handler(component, event);
    }, false);
  }

}

/**
 * Creates a select component. The properties are as follows:
 * - list - The list of options in the select. The list item are separated with a semicolon.
 * - bg_color - The background color.
 * - fg-color - The text color.
 * - border - The border of the select.
 * - font - The font to be used for the options.
 * - size - The size of the font.
 */
class cSelect extends cComponent {

  constructor(entity, settings, container) {
    super(entity, settings, container);
    this.sel_index = -1;
    this.sel_text = "";
    this.Create();
  }

  Create() {
    var list = this.settings["list"];
    var layout = this.Create_Element({
      id: this.entity.id,
      type: "form",
      attrib: {
        action: ""
      },
      css: {
        "position": "absolute",
        "left": this.entity.x + "px",
        "top": this.entity.y + "px",
        "width": this.entity.width + "px",
        "height": this.entity.height + "px",
        "margin": "0",
        "padding": "0"
      },
      subs: [
        {
          id: this.entity.id + "_select",
          type: "select",
          css: {
            "width": "calc(100% - 2px)",
            "height": "calc(100% - 2px)",
            "margin": "0",
            "padding": "2px",
            "margin-left": "1px",
            "margin-top": "1px",
            "background-color": this.settings["bg-color"] || "white",
            "color": this.settings["fg-color"] || "black",
            "border": this.settings["border"] || "1px solid silver",
            "font-family": this.settings["font"] || "Regular, sans-serif",
            "font-size": String(this.settings["size"] || (this.entity.height - 10)) + "px"
          }
        }
      ]
    }, this.container);
    // Attach list options.
    if (list != undefined) {
      var options = list.split(/\s*;\s*/);
      var option_count = options.length;
      for (var option_index = 0; option_index < option_count; option_index++) {
        var label = options[option_index].trim();
        var option = new Option(label, label);
        this.elements[this.entity.id + "_select"].add(option);
      }
    }
  }

  On(name, handler) {
    var component = this;
    this.elements[this.entity.id + "_select"].addEventListener(name, function(event) {
      this.sel_index = event.target.selectedIndex;
      this.sel_text = event.target.options[this.sel_index].text;
      handler(component, event);
    }, false);
  }

}

/**
 * A very basic edit component. The properties are:
 *
 * @see cComponent:Make_Button
 */
class cEdit extends cComponent {

  constructor(entity, settings, container) {
    super(entity, settings, container);
    this.Create();
  }

  Create() {
    var layout = this.Create_Element({
      id: this.entity.id,
      type: "form",
      attrib: {
        action: ""
      },
      css: {
        "position": "absolute",
        "left": this.entity.x + "px",
        "top": this.entity.y + "px",
        "width": this.entity.width + "px",
        "height": this.entity.height + "px",
        "margin": "0",
        "padding": "0"
      },
      subs: [
        this.Make_Edit(this.entity.id + "_edit", this.settings)
      ]
    }, this.container);
  }

  /**
   * Gets a value from the edit control.
   * @return The value of the editor.
   */
  Get_Value() {
    return this.elements[this.entity.id + "_edit"].value;
  }

  /**
   * Sets the value of the editor.
   * @param value The value to set the editor to.
   */
  Set_Value(value) {
    this.elements[this.entity.id + "_edit"].value = value;
  }

}

/**
 * A checkbox is an object that can be checked on a form. The settings are
 * as follows:
 *
 * - label - The text to display beside the checkbox.
 * - fg-color - The text color.
 * - bg-color - The background color.
 *
 * A checkbox will have the property #checked#.
 */
class cCheckbox extends cComponent {

  constructor(entity, settings, container) {
    super(entity, settings, container);
    this.checked = false;
    this.Create();
  }

  Create() {
    var layout = this.Create_Element({
      id: this.entity.id,
      type: "form",
      attrib: {
        action: ""
      },
      css: {
        "position": "absolute",
        "left": this.entity.x + "px",
        "top": this.entity.y + "px",
        "width": this.entity.width + "px",
        "height": this.entity.height + "px",
        "margin": "0",
        "padding": "0",
        "overflow": "hidden"
      },
      subs: [
        {
          id: this.entity.id + "_checkbox",
          type: "input",
          attrib: {
            type: "checkbox"
          },
          css: {
            "margin": "0",
            "margin-left": "1px",
            "margin-top": "1px",
            "margin-right": "8px",
            "width": "32px",
            "height": "100%"
          }
        },
        {
          id: this.entity.id + "_label",
          type: "span",
          text: this.settings["label"] || "",
          css: {
            "font-family": "Regular, sans-serif",
            "font-size": String(this.entity.height - 4) + "px",
            "color": this.settings["fg-color"] || "black",
            "background-color": this.settings["bg-color"] || "white",
            "line-height": this.entity.height + "px",
            "vertical-align": "top"
          }
        }
      ]
    }, this.container);
    // Handle click.
    var component = this;
    this.elements[this.entity.id + "_checkbox"].addEventListener("click", function(event) {
      component.checked = event.target.checked;
    }, false);
  }

  /**
   * Sets the checked state of the checkbox.
   * @param checked If set to true then the checkbox is 
   */
  Set_Checked(checked) {
    this.checked = checked;
    this.elements[this.entity.id + "_checkbox"].checked = checked;
  }

}

/**
 * A radio object similar to a checkbox. The settings are as follows:
 *
 * - label - The text to display beside the checkbox.
 * - fg-color - The color of the text.
 * - bg-color - The background color.
 *
 * A radio button will have the property #checked#.
 */
class cRadio extends cComponent {

  constructor(entity, settings, container) {
    super(entity, settings, container);
    this.checked = false;
    this.Create();
  }

  Create() {
    var layout = this.Create_Element({
      id: this.entity.id,
      type: "form",
      attrib: {
        action: ""
      },
      css: {
        "position": "absolute",
        "left": String(this.entity.x + 1) + "px",
        "top": String(this.entity.y + 1) + "px",
        "width": String(this.entity.width - 2) + "px",
        "height": String(this.entity.height - 2) + "px",
        "margin": "0",
        "padding": "0"
      },
      subs: [
        {
          id: this.entity.id + "_radio",
          type: "input",
          attrib: {
            type: "radio"
          },
          css: {
            "margin": "0",
            "margin-left": "1px",
            "margin-top": "1px",
            "margin-right": "8px",
            "width": "32px",
            "height": "100%"
          }
        },
        {
          id: this.entity.id + "_label",
          type: "span",
          text: this.settings["label"] || "",
          css: {
            "font-family": "Regular, sans-serif",
            "font-size": String(this.entity.height - 4) + "px",
            "color": this.settings["fg-color"] || "black",
            "background-color": this.settings["bg-color"] || "white",
            "line-height": this.entity.height + "px",
            "vertical-align": "top"
          }
        }
      ]
    }, this.container);
    // Handle click.
    var component = this;
    this.elements[this.entity.id + "_radio"].addEventListener("click", function(event) {
      component.checked = event.target.checked;
    }, false);
  }

  On(name, handler) {
    var component = this;
    this.elements[this.entity.id + "_radio"].addEventListener(name, function(event) {
      handler(component, event);
    }, false);
  }

  /**
   * Sets the checked state of the radio button.
   * @param checked True if checked, false otherwise.
   */
  Set_Checked(checked) {
    this.elements[this.entity.id + "_radio"].checked = checked;
  }

}

/**
 * A wiki can display and edit markdown. The markdown is sent to the server
 * via a passcode. The properties are as follows:
 *
 * - fg-color - The text color.
 * - bg-color - The background color.
 * - border - The border around the display.
 * - font - The display font.
 * - size - The size of the display font.
 * - file - The file to load the wiki from.
 *
 * @see cComponent:Make_Edit
 */
class cWiki extends cComponent {

  constructor(entity, settings, container) {
    super(entity, settings, container);
    this.Create();
  }

  Create() {
    var layout = this.Create_Element({
      id: this.entity.id,
      type: "div",
      css: {
        "position": "absolute",
        "left": this.entity.x + "px",
        "top": this.entity.y + "px",
        "width": this.entity.width + "px",
        "height": this.entity.height + "px"
      },
      subs: [
        this.Make_Form(this.entity.id + "_form", [
          this.Make_Edit(this.entity.id, this.settings),
          this.Make_Button(this.entity.id + "_save", {
            "right": 16,
            "bottom": 5,
            "width": 64,
            "height": 32,
            "label": "Save",
            "bg-color": "lightgreen",
            "opacity": "0.8"
          }),
          this.Make_Button(this.entity.id + "_cancel", {
            "right": 16,
            "top": 5,
            "width": 64,
            "height": 32,
            "label": "Cancel",
            "bg-color": "lightblue",
            "opacity": "0.8"
          })
        ]),
        {
          id: this.entity.id + "_display",
          type: "div",
          css: {
            "position": "absolute",
            "left": "1px",
            "top": "1px",
            "width": "calc(100% - 8px)",
            "height": "calc(100% - 8px)",
            "padding": "2px",
            "font-family": this.settings["font"] || "Regular, sans-serif",
            "font-size": String(this.settings["size"] || 16) + "px",
            "color": this.settings["fg-color"] || "black",
            "background-color": this.settings["bg-color"] || "white",
            "overflow": "scroll",
            "border": this.settings["border"] || "1px solid silver"
          }
        },
        this.Make_Button(this.entity.id + "_edit", {
          "right": 16,
          "bottom": 5,
          "width": 64,
          "height": 32,
          "label": "Edit",
          "opacity": 0.8,
          "bg-color": "lightblue",
          "opacity": "0.8"
        }),
        this.Make_Loading_Sign(),
        this.Make_Saving_Sign()
      ]
    }, this.container);
    this.Init_Loading_Click();
    this.Init_Saving_Click();
    // Load from file if specified.
    if (this.settings["file"]) {
      this.Load(this.settings["file"]);
    }
    var component = this;
    this.elements[this.entity.id + "_edit"].addEventListener("click", function(event) {
      component.Hide(component.entity.id + "_edit");
      component.Hide(component.entity.id + "_display");
      component.elements[component.entity.id].focus();
      component.elements[component.entity.id].setSelectionRange(0, 0);
    }, false);
    this.elements[this.entity.id + "_save"].addEventListener("click", function(event) {
      component.elements[component.entity.id + "_display"].innerHTML = Format(component.elements[component.entity.id].value);
      component.elements[component.entity.id + "_display"].scrollTop = 0;
      component.Show(component.entity.id + "_edit");
      component.Show(component.entity.id + "_display");
      // Save out to a file if specified.
      if (component.settings["file"]) {
        component.Toggle_Saving_Sign(true);
        Save_File("Database/" + component.settings["file"], component.elements[component.entity.id].value, function(message) {
          component.Toggle_Saving_Sign(false);
        });
      }
    }, false);
    this.elements[this.entity.id + "_cancel"].addEventListener("click", function(event) {
      component.Show(component.entity.id + "_edit");
      component.Show(component.entity.id + "_display");
      component.elements[component.entity.id + "_display"].scrollTop = 0;
    }, false);
    // Hide if in visitor mode.
    if ($user_mode == "visitor") {
      this.Hide(this.entity.id + "_edit");
    }
  }

  /**
   * Loads the wiki from a file and displays the contents.
   * @param file The file to load the wiki from.
   */
  Load(file) {
    this.settings["file"] = file;
    var component = this;
    component.Toggle_Loading_Sign(true);
    Load_File("Database/" + file, function(data) {
      component.elements[component.entity.id + "_display"].innerHTML = Format(data);
      component.elements[component.entity.id].value = data; // We need to load the edit control too.
      component.elements[component.entity.id + "_display"].scrollTop = 0;
      component.Toggle_Loading_Sign(false);
    }, function(error) {
      component.elements[component.entity.id + "_display"].innerHTML = "";
      component.elements[component.entity.id].value = "";
      component.elements[component.entity.id + "_display"].scrollTop = 0;
      component.Toggle_Loading_Sign(false);
    });
  }

  /**
   * Sets the file to save to.
   * @param file The file to save to.
   */
  Set_File(file) {
    this.settings["file"] = file;
  }

  /**
   * Loads a wiki document from an external file.
   * @param name The name of the file to load from. 
   */
  Load_External(name) {
    var component = this;
    component.Toggle_Loading_Sign(true);
    Load_File(name + ".txt", function(data) {
      component.elements[component.entity.id + "_display"].innerHTML = Format(data);
      component.elements[component.entity.id].value = data; // We need to load the edit control too.
      component.elements[component.entity.id + "_display"].scrollTop = 0;
      component.Toggle_Loading_Sign(false);
    }, function(error) {
      component.elements[component.entity.id + "_display"].innerHTML = "";
      component.elements[component.entity.id].value = "";
      component.elements[component.entity.id + "_display"].scrollTop = 0;
      component.Toggle_Loading_Sign(false);
    });
  }

}

/**
 * A static picture to place on a web page. The options are as follows:
 *
 * image - The file to load the picture from.
 */
class cPicture extends cComponent {

  constructor(entity, settings, container) {
    super(entity, settings, container);
    this.Create();
  }

  Create() {
    var component = this;
    var image = new Image();
    image.src = Get_Image(this.settings["image"], false);
    image.onload = function() {
      var layout = component.Create_Element({
        id: component.entity.id,
        type: "div",
        css: {
          "position": "absolute",
          "left": String(component.entity.x + 1) + "px",
          "top": String(component.entity.y + 1) + "px",
          "width": String(component.entity.width - 2) + "px",
          "height": String(component.entity.height - 2) + "px",
          "background-image": Get_Image(component.settings["image"], true),
          "background-repeat": "no-repeat"
        }
      }, component.container);
    };
    image.onerror = function() {
      var layout = component.Create_Element({
        id: component.entity.id,
        type: "div",
        text: "No image loaded.",
        css: {
          "position": "absolute",
          "left": String(component.entity.x + 1) + "px",
          "top": String(component.entity.y + 1) + "px",
          "width": String(component.entity.width - 2) + "px",
          "height": String(component.entity.height - 2) + "px",
          "line-height": String(component.entity.height - 2) + "px",
          "text-align": "center",
          "color": "black",
          "font-family": "Regular, sans-serif",
          "font-size": "16px"
        }
      }, component.container);
    };
  }

  /**
   * Clears out the picture.
   */
  Clear() {
    this.elements[this.entity.id].innerHTML = "No image loaded.";
    this.elements[this.entity.id].style.lineHeight = String(this.entity.height - 2) + "px";
    this.elements[this.entity.id].style.textAlign = "center";
    this.elements[this.entity.id].style.color = "black";
    this.elements[this.entity.id].style.fontFamily = "Regular, sans-serif";
    this.elements[this.entity.id].style.fontSize = "16px";
    this.elements[this.entity.id].style.backgroundImage = "none";
  }

  /**
   * Loads up a picture.
   * @param name The name of the picture to load. 
   */
  Load(name) {
    var component = this;
    var image = new Image();
    image.src = Get_Image(name, false, "Graphics");
    image.onload = function() {
      component.elements[component.entity.id].innerHTML = "";
      component.elements[component.entity.id].style.backgroundImage = Get_Image(name, true, "Graphics");
      component.elements[component.entity.id].style.backgroundRepeat = "no-repeat";
    };
    image.onerror = function() {
      component.elements[component.entity.id].innerHTML = "No image loaded.";
      component.elements[component.entity.id].style.lineHeight = String(component.entity.height - 2) + "px";
      component.elements[component.entity.id].style.textAlign = "center";
      component.elements[component.entity.id].style.color = "black";
      component.elements[component.entity.id].style.fontFamily = "Regular, sans-serif";
      component.elements[component.entity.id].style.fontSize = "16px";
      component.elements[component.entity.id].style.backgroundImage = "none";
    };
  }

}

/**
 * A side menu component. Items are displayed from top down and a scrollbar is
 * present in the menu. Each menu item is separated by a semicolon. Each item
 * consists of a pair specifying the label and image respectively. A menu item
 * can have either text or an image.
 *
 * Properties are as follows:
 *
 * - items - The menu items with each separated by a semicolon.
 * - height - The height of each menu item.
 * - fg-color - The color of the font.
 * - bg-color - The background color.
 * - highlight-color - The color of the menu item selected.
 * - file - The file with the items to load.
 * - filter - If set to on then a filter is shown.
 */
class cMenu extends cComponent {

  constructor(entity, settings, container) {
    super(entity, settings, container);
    this.item_selected = "";
    this.handler = null;
    this.sel_text = "";
    this.items = [];
    this.timer = null;
    this.Create();
  }

  Create() {
    var layout = this.Create_Element({
      id: this.entity.id + "_menu_area",
      type: "div",
      css: {
        "position": "absolute",
        "left": String(this.entity.x + 1) + "px",
        "top": String(this.entity.y + 1) + "px",
        "width": String(this.entity.width - 2) + "px",
        "height": String(this.entity.height - 2) + "px"
      },
      subs: [
        this.Make_Form(this.entity.id + "_form", [
          this.Make_Edit(this.entity.id + "_editor", this.settings),
          this.Make_Button(this.entity.id + "_save", {
            "left": 16,
            "bottom": 5,
            "width": 64,
            "height": 32,
            "label": "Save",
            "bg-color": "lightgreen",
            "opacity": "0.5"
          }),
          this.Make_Button(this.entity.id + "_cancel", {
            "right": 16,
            "bottom": 5,
            "width": 64,
            "height": 32,
            "label": "Cancel",
            "bg-color": "lightblue",
            "opacity": "0.5"
          })
        ]),
        {
          id: this.entity.id,
          type: "div",
          css: {
            "position": "absolute",
            "left": "0",
            "top": "0",
            "width": "100%",
            "height": (this.settings["filter"] == "on") ? "calc(100% - 24px)" : "100%",
            "overflow-y": "scroll",
            "background-color": this.settings["bg-color"] || "white"
          }
        },
        this.Make_Button(this.entity.id + "_edit", {
          "right": 16,
          "bottom": (this.settings["filter"] == "on") ? 29 : 5,
          "width": 64,
          "height": 32,
          "label": "Edit",
          "bg-color": "lightgreen",
          "opacity": "0.5"
        }),
        {
          id: this.entity.id + "_search_area",
          type: "div",
          css: {
            "width": "100%",
            "height": "24px",
            "position": "absolute",
            "left": "0",
            "bottom": "0",
            "background-color": "white",
            "display": (this.settings["filter"] == "on") ? "block": "none"
          },
          subs: [
            this.Make_Form(this.entity.id + "_search_form", [
              this.Make_Field(this.entity.id + "_search", {
                "type": "text",
                "fg-color": "black",
                "bg-color": "white",
                "height": 24,
                "label": "Search terms."
              })
            ])
          ]
        }
      ]
    }, this.container);
    // Set up handlers for buttons.
    var component = this;
    this.elements[this.entity.id + "_edit"].addEventListener("click", function(event) {
      component.Hide(component.entity.id + "_edit");
      component.Hide(component.entity.id);
      component.Hide(component.entity.id + "_search_area");
      component.elements[component.entity.id + "_editor"].focus();
      component.elements[component.entity.id + "_editor"].setSelectionRange(0, 0);
    }, false);
    this.elements[this.entity.id + "_save"].addEventListener("click", function(event) {
      component.Show(component.entity.id + "_edit");
      component.Show(component.entity.id);
      if (component.settings["filter"] == "on") {
        component.Show(component.entity.id + "_search_area");
      }
      var items = Split(component.elements[component.entity.id + "_editor"].value);
      component.items = items.slice(0);
      component.Load_Menu(items, component.elements[component.entity.id]);
      if (component.settings["file"]) {
        Save_File("Database/" + component.settings["file"], component.elements[component.entity.id + "_editor"].value);
      }
    }, false);
    this.elements[this.entity.id + "_cancel"].addEventListener("click", function(event) {
      component.Show(component.entity.id + "_edit");
      component.Show(component.entity.id);
      if (component.settings["filter"] == "on") {
        component.Show(component.entity.id + "_search_area");
      }
    }, false);
    this.elements[this.entity.id + "_search"].addEventListener("keydown", function(event) {
      if (component.timer) {
        clearTimeout(component.timer);
      }
      component.timer = setTimeout(function() {
        var items = component.Search_Menu(component.elements[component.entity.id + "_search"].value);
        component.Load_Menu(items, component.elements[component.entity.id]);
        component.timer = null; // Make timer free.
      }, 500);
    }, false);
    if (this.settings["items"]) {
      var items = this.settings["items"].split(/\s*;\s*/);
      this.items = items.slice(0);
      this.Load_Menu(items, this.elements[this.entity.id]);
      // Set editor data.
      this.elements[this.entity.id + "_editor"].value = items.join("\n");
    }
    else if (this.settings["file"]) {
      Load_File("Database/" + this.settings["file"], function(data) {
        var items = Split(data);
        component.items = items.slice(0);
        component.Load_Menu(items, component.elements[component.entity.id]);
        component.elements[component.entity.id + "_editor"].value = items.join("\n");
      });
    }
    // Hide if not in editor mode.
    if ($user_mode == "visitor") {
      this.Hide(this.entity.id + "_edit");
    }
  }

  /**
   * Internal routine to load the menu. It will replace the menu with new items.
   * @param items All items to be loaded as an array.
   * @param container The container to load the menu in.
   */
  Load_Menu(items, container) {
    this.item_selected = ""; // Clear out selected item.
    this.Remove_Elements(container);
    // Format for items:
    //
    // label:image
    var item_count = items.length;
    for (var item_index = 0; item_index < item_count; item_index++) {
      var item = items[item_index];
      var options = item.split(/\s*\:\s*/);
      var label = options[0];
      var image = options[1];
      var layout = this.Create_Element({
        id: this.entity.id + "_item_" + item_index,
        text: label,
        type: "div",
        css: {
          "width": "calc(100% - 8px)",
          "height": "calc(" + (this.settings["height"] || 24) + "px - 8px)",
          "overflow": "hidden",
          "padding": "4px",
          "cursor": String(Get_Image("Cursor.png", true) + ", default"),
          "line-height": "calc(" + (this.settings["height"] || 24) + "px - 8px)",
          "font-family": "Regular, sans-serif",
          "font-size": String((this.settings["height"] || 24) - 8) + "px",
          "color": this.settings["fg-color"] || "black",
          "background-image": (image.length > 0) ? Get_Image(image, true) : "none",
          "background-repeat": "no-repeat",
          "background-color": this.settings["bg-color"] || "transparent",
          "overflow": "hidden",
          "text-indent": (image.length > 0) ? String((this.settings["height"] || 24) + "px") : "0"
        }
      }, container);
      var component = this;
      this.elements[this.entity.id + "_item_" + item_index].addEventListener("click", function(event) {
        var name = event.target.codeloader_id;
        // Highlight the menu item to show position.
        if (component.item_selected.length > 0) {
          component.Change_Color(component.item_selected, component.settings["bg-color"] || "transparent");
        }
        component.Change_Color(name, component.settings["highlight-color"] || "lightblue");
        component.item_selected = name;
        component.sel_text = event.target.innerHTML;
        if (component.handler) {
          component.handler(component, event);
        }
      }, false);
    }
  }

  /**
   * Searches a menu and returns only the items in the search.
   * @param search The search string.
   * @return The menu items to display.
   */
  Search_Menu(search) {
    var items = [];
    if (search.length > 0) {
      var terms = search.split(/\s+/);
      var search_exp = new RegExp(terms.join("|"), "i");
      var item_count = this.items.length;
      for (var item_index = 0; item_index < item_count; item_index++) {
        var item = this.items[item_index];
        if (item.match(search_exp)) {
          items.push(item);
        }
      }
    }
    else {
      items = this.items.slice(0);
    }
    return items;
  }

  /**
   * You pass in the handler here. To get the selected item you can either use
   * the component property #sel_text# or #item_selected#. With #item_selected#
   * you will access item menu item by number. The item selected is specified as
   * #<component_id>_item_<item_index>#.
   */
  On(name, handler) {
    this.handler = handler;
  }

  /**
   * Loads a menu from an external file.
   * @param name The name of the file to load the menu from.
   */
  Load_External(name) {
    var component = this;
    Load_File(name + ".txt", function(data) {
      var items = Split(data);
      component.items = items.slice(0);
      component.Load_Menu(items, component.elements[component.entity.id]);
      component.elements[component.entity.id + "_editor"].value = items.join("\n");
    });
  }

  /**
   * Loads a menu from a list.
   * @param list The list of menu items in menu format. 
   */
  Load_From_List(list) {
    this.items = list.slice(0);
    this.Load_Menu(list, this.elements[this.entity.id]);
    this.elements[this.entity.id + "_editor"].value = list.join("\n");
  }

  /**
   * Saves the menu list to a file.
   * @param name The name of the file to save to.
   */
  Save(name) {
    Save_File("Database/" + name + ".txt", this.elements[this.entity.id + "_editor"].value);
  }

  /**
   * Adds an item to the menu.
   * @param item The item to add in menu format. 
   */
  Add_Item(item) {
    this.items.push(item);
    this.elements[this.entity.id + "_editor"].value = this.items.join("\n");
    this.Load_Menu(this.items, this.elements[this.entity.id]);
  }

  /**
   * Removes an item given the index.
   * @param index The index of the item. 
   */
  Remove_Item(index) {
    if (this.items[index] != undefined) {
      this.items.splice(index, 1);
      this.elements[this.entity.id + "_editor"].value = this.items.join("\n");
      this.Load_Menu(this.items, this.elements[this.entity.id]);
    }
  }

  /**
   * Gets the index of the selected item.
   * @return The index of the selected item.
   */
  Get_Selected_Index() {
    var index = -1;
    if (this.item_selected.length > 0) {
      index = parseInt(this.item_selected.split(/_item_/).pop());
    }
    return index;
  }

  /**
   * Clears out the menu.
   */
  Clear() {
    this.items = [];
    this.elements[this.entity.id + "_editor"].value = "";
    this.Load_Menu(this.items, this.elements[this.entity.id]);
  }

  /**
   * Updates an item by index.
   * @param value The menu item value.
   * @param index The item index.
   */
  Update_Item(value, index) {
    if (this.items[index] != undefined) {
      this.items[index] = value;
      this.elements[this.entity.id + "_editor"].value = this.items.join("\n");
      this.Load_Menu(this.items, this.elements[this.entity.id]);
    }
  }

}

/**
 * A toolbar consists of a group a icons going out to the side. It is a graphical
 * menu. The data is formatted like in a menu.
 * @see cMenu:constructor
 *
 * Properties are as follows:
 *
 * - items - The menu items.
 * - file - The file to load the items from. The items are line separated.
 */
class cToolbar extends cComponent {

  constructor(entity, settings, container) {
    super(entity, settings, container);
    this.handler = null;
    this.sel_text = "";
    this.Create();
  }

  Create() {
    var layout = this.Create_Element({
      id: this.entity.id,
      type: "div",
      css: {
        "position": "absolute",
        "left": String(this.entity.x + 1) + "px",
        "top": String(this.entity.y + 1) + "px",
        "width": String(this.entity.width - 2) + "px",
        "height": String(this.entity.height - 2) + "px",
        "overflow-y": "scroll"
      }
    }, this.container);
    if (this.settings["items"]) {
      var items = this.settings["items"].split(/\s*;\s*/);
      this.Load_Toolbar(items, layout);
    }
    else if (this.settings["file"]) {
      var component = this;
      Load_File("Database/" + this.settings["file"], function(data) {
        var items = Split(data);
        component.Load_Toolbar(items, layout);
      });
    }
  }

  /**
   * Loads the toolbar with a list of items.
   * @param items An array of pairs to load. Format is image:label.
   * @param container The container to load the items into.
   */
  Load_Toolbar(items, container) {
    // Item Format:
    //
    // image:label
    var item_count = items.length;
    for (var item_index = 0; item_index < item_count; item_index++) {
      var item = items[item_index];
      var options = item.split(/\s*:\s*/);
      var image = options[0];
      var label = options[1];
      var layout = this.Create_Element({
        id: this.entity.id + "_tool_" + item_index,
        type: "div",
        attrib: {
          title: label
        },
        css: {
          "width": String(this.entity.height - 2) + "px",
          "height": String(this.entity.height - 2) + "px",
          "background-image": Get_Image(image, true),
          "background-repeat": "no-repeat",
          "background-size": String(this.entity.height - 2) + "px " + String(this.entity.height - 2) + "px",
          "cursor": String(Get_Image("Cursor.png", true) + ", default"),
          "margin-right": String(this.settings["spacing"] || 4) + "px",
          "float": "left"
        }
      }, container);
      // Create click handler.
      var component = this;
      this.elements[this.entity.id + "_tool_" + item_index].addEventListener("click", function(event) {
        var name = event.target.codeloader_id;
        component.sel_text = component.elements[name].title;
        if (component.handler) {
          component.handler(component, event);
        }
        if (component.settings["pages"] == "on") {
          Flip_Page(component.sel_text);
        }
      }, false);
    }
  }

  /**
   * @see cMenu:On
   *
   * #Note:# Only the selected text from the label is set.
   */
  On(name, handler) {
    this.handler = handler;
  }

}

/**
 * This is a button with an image as a background. The properties are as
 * follows:
 *
 * - label - The text to display on the button.
 * - image - The file to load the button image from.
 * - hover - The hover image which is optional.
 * - link - The page to go to when clicked.
 * - font - The font to use for the button.
 * - size - The size of the font in pixels.
 * - color - The color of the label.
 * - popup - The text to display on the hover popup.
 * - orientation - Can be set to "down" to display popup under button.
 * - links - A list of links to display in drop menu. Also affected by orientation.
 */
class cImage_Button extends cComponent {

  constructor(entity, settings, container) {
    super(entity, settings, container);
    this.hov_loaded = false;
    this.Create();
  }

  Create() {
    var component = this;
    var image = new Image();
    image.src = Get_Image(this.settings["image"], false);
    image.onload = function() {
      var layout = component.Create_Element({
        id: component.entity.id,
        type: "div",
        text: component.settings["label"],
        css: {
          "position": "absolute",
          "left": String(component.entity.x + 1) + "px",
          "top": String(component.entity.y + 1) + "px",
          "width": String(component.entity.width - 2) + "px",
          "height": String(component.entity.height - 2) + "px",
          "background-image": Get_Image(component.settings["image"], true),
          "background-repeat": "no-repeat",
          "text-align": "center",
          "line-height": String(component.entity.height - 2) + "px",
          "font-family": component.settings["font"] || "Regular, sans-serif",
          "font-size": String(component.settings["size"] || 24) + "px",
          "font-weight": "bold",
          "color": component.settings["color"] || "white",
          "cursor": String(Get_Image("Cursor.png", true) + ", default")
        }
      }, component.container);
      var orientation = (component.settings["orientation"] == "down") ? component.settings["orientation"] : "normal";
      var popup = component.Create_Element({
        id: component.entity.id + "_popup",
        type: "div",
        text: component.settings["popup"],
        css: {
          "position": "absolute",
          "left": (orientation == "down") ? String(component.entity.x) + "px" : String(component.entity.x + component.entity.width) + "px",
          "top": (orientation == "down") ? String(component.entity.y + component.entity.height) + "px" : String(component.entity.y) + "px",
          "width": "150px",
          "height": "70px",
          "color": "black",
          "background-color": "white",
          "padding": "4px",
          "border": "1px solid #9DC4CF",
          "border-radius": "10px",
          "overflow": "hidden",
          "font-size": "14px",
          "z-index": "10",
          "display": "none"
        }
      }, component.container);
      var drop_menu = component.Create_Element({
        id: component.entity.id + "_drop_menu",
        type: "div",
        css: {
          "position": "absolute",
          "left": (orientation == "down") ? String(component.entity.x) + "px" : String(component.entity.x + component.entity.width) + "px",
          "top": (orientation == "down") ? String(component.entity.y + component.entity.height) + "px" : String(component.entity.y) + "px",
          "width": "158px",
          "height": "auto",
          "border": "1px solid silver",
          "background-color": "#ECF2FF",
          "display": "none"
        },
        subs: [
          {
            id: component.entity.id + "_menu_title",
            type: "div",
            text: component.settings["label"],
            css: {
              "width": "calc(100% - 8px)",
              "height": "24px",
              "line-height": "24px",
              "font-size": "20px",
              "border": "1px solid silver",
              "margin": "1px",
              "padding": "2px",
              "text-align": "center",
              "font-weight": "bold",
              "background-color": "#BDCEF1"
            }
          }
        ]
      }, component.container);
      // Add links.
      if (component.settings["links"]) {
        var links = component.settings["links"].split(/;/);
        var link_count = links.length;
        for (var link_index = 0; link_index < link_count; link_index++) {
          var pair = links[link_index].split(/:/);
          var label = pair[0];
          var page = pair[1];
          var menu_item = component.Create_Element({
            id: component.entity.id + "_menu_item_" + link_index,
            type: "div",
            text: label,
            css: {
              "width": "calc(100% - 8px)",
              "height": "24px",
              "line-height": "24px",
              "font-size": "16px",
              "border": "1px solid silver",
              "margin": "1px",
              "padding": "2px",
              "text-align": "center"
            }
          }, component.entity.id + "_drop_menu");
          menu_item.fl_link = page;
          menu_item.addEventListener("click", function(event) {
            var element = event.currentTarget;
            var link = element.fl_link;
            drop_menu.style.display = "none";
            Flip_Page(link);
          }, false);
          menu_item.addEventListener("mouseover", function(event) {
            var element = event.currentTarget;
            element.style.backgroundColor = "yellow";
          }, false);
          menu_item.addEventListener("mouseout", function(event) {
            var element = event.currentTarget;
            element.style.backgroundColor = "transparent";
          }, false);
        }
      }
      if (component.settings["hover"]) {
        var hov_image = new Image();
        hov_image.src = Get_Image(component.settings["hover"], false);
        hov_image.onload = function() {
          component.hov_loaded = true;
        };
      }
      layout.addEventListener("mouseover", function(event) {
        if (component.hov_loaded) {
          layout.style.backgroundImage = Get_Image(component.settings["hover"], true);
        }
        if (component.settings["popup"]) {
          component.elements[component.entity.id + "_popup"].style.display = "block";
        }
      }, false);
      layout.addEventListener("mouseout", function(event) {
        if (component.hov_loaded) {
          layout.style.backgroundImage = Get_Image(component.settings["image"], true);
        }
        if (component.settings["popup"]) {
          component.elements[component.entity.id + "_popup"].style.display = "none";
        }
      }, false);
      if (component.settings["link"]) {
        layout.addEventListener("click", function(event) {
          Flip_Page(component.settings["link"]);
        }, false);
      }
      if (component.settings["links"]) {
        layout.addEventListener("click", function(event) {
          var menu = component.elements[component.entity.id + "_drop_menu"];
          if (menu.style.display == "none") {
            menu.style.display = "block";
            if (component.settings["popup"]) {
              component.elements[component.entity.id + "_popup"].style.display = "none";
            }
          }
          else {
            menu.style.display = "none";
          }
        }, false);
      }
    };
    image.onerror = function() {
      var layout = component.Create_Element({
        id: component.entity.id,
        type: "div",
        text: "No image loaded.",
        css: {
          "position": "absolute",
          "left": String(component.entity.x + 1) + "px",
          "top": String(component.entity.y + 1) + "px",
          "width": String(component.entity.width - 2) + "px",
          "height": String(component.entity.height - 2) + "px",
          "line-height": String(component.entity.height - 2) + "px",
          "text-align": "center",
          "color": "black",
          "font-family": "Regular, sans-serif",
          "font-size": "16px"
        }
      }, component.container);
    };
  }

  On(name, handler) {
    var component = this;
    this.elements[this.entity.id].addEventListener(name, function(event) {
      // Call handler here.
      handler(component, event);
    }, false);
  }

}

/**
 * This is a simple label that you can place anywhere on the screen.
 * The settings are as follows:
 *
 * - label - The text to display on the label.
 * - font - The font to use for the label.
 * - size - The size of the font in pixels.
 * - color - The color of the text on the label.
 * - center - Whether the text is centered. Set to "on" or "off".
 * - bold - Turn on bolding or not. Set to "on" or "off".
 */
class cLabel extends cComponent {

  constructor(entity, settings, container) {
    super(entity, settings, container);
    this.Create();
  }

  Create() {
    var layout = this.Create_Element({
      id: this.entity.id,
      type: "div",
      text: this.settings["label"].replace(/\(c\)/g, ","), // Replace commas.
      css: {
        "position": "absolute",
        "left": String(this.entity.x + 1) + "px",
        "top": String(this.entity.y + 1) + "px",
        "width": String(this.entity.width - 2) + "px",
        "height": String(this.entity.height - 2) +"px",
        "font-family": this.settings["font"] || "Regular",
        "font-size": String(this.settings["size"] || 20) + "px",
        "color": this.settings["color"] || "black",
        "text-align": (this.settings["center"] == "off") ? "left" : "center",
        "line-height": String(this.entity.height - 2) + "px",
        "font-weight": (this.settings["bold"] == "on") ? "bold" : "normal"
      }
    }, this.container);
  }

}

/**
 * This is a scrolling marquee. The properties are as follows:
 *
 * - delay - The scroll speed delay.
 * - speed - The speed of the scroll.
 * - label - The text to be displayed.
 * - font - The font to be used.
 * - size - The size of the font.
 * - color - The color of the text.
 */
class cMarquee extends cComponent {

  constructor(entity, settings, container) {
    super(entity, settings, container);
    this.timer = null;
    this.pos = this.entity.width;
    this.Create();
  }

  Create() {
    var size = this.settings["size"] || "16";
    var layout = this.Create_Element({
      id: this.entity.id,
      type: "div",
      css: {
        "position": "absolute",
        "left": String(this.entity.x + 1) + "px",
        "top": String(this.entity.y + 1) + "px",
        "width": String(this.entity.width - 2) + "px",
        "height": String(this.entity.height - 2) + "px",
        "overflow": "hidden"
      },
      subs: [
        {
          id: this.entity.id + "_marquee",
          type: "div",
          text: this.settings["label"],
          css: {
            "position": "absolute",
            "left": String(this.entity.width) + "px",
            "top": "1px",
            "width": String(this.settings["label"].length * parseInt(size)) + "px",
            "height": String(this.entity.height - 2) + "px",
            "font-family": this.settings["font"] || "Regular",
            "font-size": size + "px",
            "color": this.settings["color"] || "black"
          }
        }
      ]
    }, this.container);
    // Set up the timer.
    this.Set_Timer();
  }

  /**
   * Sets up the timer and scrolling.
   */
  Set_Timer() {
    var component = this;
    this.timer = setInterval(function() {
      var marquee = component.elements[component.entity.id + "_marquee"];
      component.pos -= component.settings["speed"];
      if (component.pos < -marquee.clientWidth) {
        component.pos = component.entity.width;
      }
      marquee.style.left = String(component.pos) + "px";
    }, this.settings["delay"]);
  }

  /**
   * Pause execution of the timer.
   */
  Pause() {
    clearInterval(this.timer);
    this.timer = null;
  }

  /**
   * Resume the execution of the timer.
   */
  Resume() {
    this.Set_Timer();
  }

}

/**
 * A tool palette is a collection of tools arranged in rows and columns,
 * like on a grid. The data is formatted like the menu.
 * @see cMenu:constructor
 *
 * Properties are as follows:
 *
 * - items - The list of items to appear in the tool palette.
 * - file - A file containing the list of items. These are line separated.
 * - columns - The number of columns.
 * - scale - How big the icons should be. This can be in percent or pixels.
 * - filter - Set this to "on" to turn on the search filter.
 */
class cTool_Palette extends cComponent {

  constructor(entity, settings, container) {
    super(entity, settings, container);
    this.item_selected = "";
    this.items = [];
    this.timer = null;
    this.sel_text = "";
    this.Create();
  }

  Create() {
    var layout = this.Create_Element({
      id: this.entity.id + "_tool_area",
      type: "div",
      css: {
        "position": "absolute",
        "left": String(this.entity.x + 1) + "px",
        "top": String(this.entity.y + 1) + "px",
        "width": String(this.entity.width - 2) + "px",
        "height": String(this.entity.height - 2) + "px"
      },
      subs: [
        this.Make_Form(this.entity.id + "_form", [
          this.Make_Edit(this.entity.id + "_editor", this.settings),
          this.Make_Button(this.entity.id + "_save", {
            "left": 16,
            "bottom": 5,
            "width": 64,
            "height": 32,
            "label": "Save",
            "bg-color": "lightgreen",
            "opacity": "0.5"
          }),
          this.Make_Button(this.entity.id + "_cancel", {
            "right": 16,
            "bottom": 5,
            "width": 64,
            "height": 32,
            "label": "Cancel",
            "bg-color": "lightblue",
            "opacity": "0.5"
          })
        ]),
        {
          id: this.entity.id,
          type: "div",
          css: {
            "position": "absolute",
            "left": "0",
            "top": "0",
            "width": "100%",
            "height": (this.settings["filter"] == "on") ? "calc(100% - 24px)" : "100%",
            "overflow-y": "scroll",
            "background-color": this.settings["bg-color"] || "white"
          }
        },
        this.Make_Button(this.entity.id + "_edit", {
          "right": 16,
          "bottom": (this.settings["filter"] == "on") ? 29 : 5,
          "width": 64,
          "height": 32,
          "label": "Edit",
          "bg-color": "lightgreen",
          "opacity": "0.5"
        }),
        {
          id: this.entity.id + "_search_area",
          type: "div",
          css: {
            "width": "100%",
            "height": "24px",
            "position": "absolute",
            "left": "0",
            "bottom": "0",
            "background-color": "white",
            "display": (this.settings["filter"] == "on") ? "block": "none"
          },
          subs: [
            this.Make_Form(this.entity.id + "_search_form", [
              this.Make_Field(this.entity.id + "_search", {
                "type": "text",
                "fg-color": "black",
                "bg-color": "white",
                "height": 24,
                "label": "Search terms."
              })
            ])
          ]
        }
      ]
    }, this.container);
    // Set up handlers for buttons.
    var component = this;
    this.elements[this.entity.id + "_edit"].addEventListener("click", function(event) {
      component.Hide(component.entity.id + "_edit");
      component.Hide(component.entity.id);
      component.Hide(component.entity.id + "_search_area");
      component.elements[component.entity.id + "_editor"].focus();
      component.elements[component.entity.id + "_editor"].setSelectionRange(0, 0);
    }, false);
    this.elements[this.entity.id + "_save"].addEventListener("click", function(event) {
      component.Show(component.entity.id + "_edit");
      component.Show(component.entity.id);
      if (component.settings["filter"] == "on") {
        component.Show(component.entity.id + "_search_area");
      }
      var items = Split(component.elements[component.entity.id + "_editor"].value);
      component.items = items.slice(0);
      component.Load_Tools(items, component.elements[component.entity.id]);
      if (component.settings["file"]) {
        Save_File("Database/" + component.settings["file"], component.elements[component.entity.id + "_editor"].value);
      }
    }, false);
    this.elements[this.entity.id + "_cancel"].addEventListener("click", function(event) {
      component.Show(component.entity.id + "_edit");
      component.Show(component.entity.id);
      if (component.settings["filter"] == "on") {
        component.Show(component.entity.id + "_search_area");
      }
      component.elements[component.entity.id + "_editor"].value = component.items.join("\n");
    }, false);
    this.elements[this.entity.id + "_search"].addEventListener("keydown", function(event) {
      if (component.timer) {
        clearTimeout(component.timer);
      }
      component.timer = setTimeout(function() {
        var items = component.Search_Tools(component.elements[component.entity.id + "_search"].value);
        component.Load_Tools(items, component.elements[component.entity.id]);
        component.timer = null; // Make timer free.
      }, 500);
    }, false);
    if (this.settings["items"]) {
      var items = this.settings["items"].split(/\s*;\s*/);
      this.items = items.slice(0);
      this.Load_Tools(items, this.elements[this.entity.id]);
      // Set editor data.
      this.elements[this.entity.id + "_editor"].value = items.join("\n");
    }
    else if (this.settings["file"]) {
      var component = this;
      Load_File("Database/" + this.settings["file"], function(data) {
        var items = Split(data);
        component.items = items.slice(0);
        component.Load_Tools(items, component.elements[component.entity.id]);
        component.elements[component.entity.id + "_editor"].value = items.join("\n");
      });
    }
    // Hide if in visitor mode.
    if ($user_mode == "visitor") {
      this.Hide(this.entity.id + "_edit");
    }
  }

  /**
   * Loads the tool palette with the tools.
   * @param items An array of pairs to load. Format is image:label.
   * @param container The container to load the items into.
   */
  Load_Tools(items, container) {
    this.item_selected = "";
    this.Remove_Elements(container);
    // Item Format:
    //
    // image:label
    var entity_w = this.entity.width - 2;
    var width = (this.settings["columns"]) ? Math.floor(entity_w / parseInt(this.settings["columns"])) : Math.floor(entity_w / 2);
    var item_count = items.length;
    for (var item_index = 0; item_index < item_count; item_index++) {
      var item = items[item_index];
      var options = item.split(/\s*:\s*/);
      var image = options[0];
      var label = options[1];
      var layout = this.Create_Element({
        id: this.entity.id + "_tool_" + item_index,
        type: "div",
        attrib: {
          title: label
        },
        css: {
          "width": String(width - 10) + "px",
          "height": String(width- 10) + "px",
          "background-image": Get_Image(image, true),
          "background-repeat": "no-repeat",
          "background-position": "center center",
          "background-size": (this.settings["scale"]) ? String(this.settings["scale"]) + " " + String(this.settings["scale"]): "100% 100%",
          "cursor": String(Get_Image("Cursor.png", true) + ", default"),
          "float": "left",
          "margin-right": "2px",
          "margin-bottom": "5px"
        }
      }, container);
      // Create click handler.
      var component = this;
      this.elements[this.entity.id + "_tool_" + item_index].addEventListener("click", function(event) {
        var name = event.target.codeloader_id;
        component.sel_text = component.elements[name].title;
        component.item_selected = name;
        if (component.handler) {
          component.handler(component, event);
        }
      }, false);
    }
  }

  /**
   * Searches the tools and returns only the items in the search.
   * @param search The search string.
   * @return The tool items to display.
   */
  Search_Tools(search) {
    var items = [];
    if (search.length > 0) {
      var terms = search.split(/\s+/);
      var search_exp = new RegExp(terms.join("|"), "i");
      var item_count = this.items.length;
      for (var item_index = 0; item_index < item_count; item_index++) {
        var item = this.items[item_index];
        if (item.match(search_exp)) {
          items.push(item);
        }
      }
    }
    else {
      items = this.items.slice(0);
    }
    return items;
  }

  /**
   * @see cMenu:On
   *
   * #Note:# Only the selected text from the label is set.
   */
  On(name, handler) {
    this.handler = handler;
  }

  /**
   * Loads a tool palette from an external file.
   * @param name The name of the file to load the tool palette from.
   */
  Load_External(name) {
    var component = this;
    Load_File(name + ".txt", function(data) {
      var items = Split(data);
      component.items = items.slice(0);
      component.Load_Tools(items, component.elements[component.entity.id]);
      component.elements[component.entity.id + "_editor"].value = items.join("\n");
    });
  }

  /**
   * Loads a tool palette from a list.
   * @param list The list of tool items in menu format. 
   */
  Load_From_List(list) {
    this.items = list.slice(0);
    this.Load_Tools(list, this.elements[this.entity.id]);
    this.elements[this.entity.id + "_editor"].value = list.join("\n");
  }

  /**
   * Saves the tool palette to a file.
   * @param name The name of the file to save to.
   */
  Save(name) {
    Save_File("Database/" + name + ".txt", this.elements[this.entity.id + "_editor"].value);
  }

  /**
   * Adds an item to the tool palette.
   * @param item The item to add in menu format. 
   */
  Add_Item(item) {
    this.items.push(item);
    this.elements[this.entity.id + "_editor"].value = this.items.join("\n");
    this.Load_Tools(this.items, this.elements[this.entity.id]);
  }

  /**
   * Removes an item given the index.
   * @param index The index of the item. 
   */
  Remove_Item(index) {
    if (this.items[index] != undefined) {
      this.items.splice(index, 1);
      this.elements[this.entity.id + "_editor"].value = this.items.join("\n");
      this.Load_Tools(this.items, this.elements[this.entity.id]);
    }
  }

  /**
   * Gets the index of the selected item.
   * @return The index of the selected item.
   */
  Get_Selected_Index() {
    var index = -1;
    if (this.item_selected.length > 0) {
      index = parseInt(this.item_selected.split(/_tool_/).pop());
    }
    return index;
  }

  /**
   * Clears out the tool palette.
   */
  Clear() {
    this.items = [];
    this.elements[this.entity.id + "_editor"].value = "";
    this.Load_Tools(this.items, this.elements[this.entity.id]);
  }

}

/**
 * A grid view is a table-like component which allows values
 * to be entered or selected from various controls.
 *
 * Properties are as follows:
 *
 * - file - A file to load the table from. It is tab delimited. You
 *          can create this file from a spreadsheet.
 * - fg-color - The color of the text in the grid.
 * - bg-color - The background color of the grid.
 *
 * The table data is formatted as follows:
 *
 * - Each cell is tab delimited while rows are delimited by new lines.
 * - Cells may contain a value which can be textual or numeric. If the
 *   value is within brackets then it is editable. Multiple values can
 *   be separated by commas.
 *
 */
class cGrid_View extends cComponent {

  constructor(entity, settings, container) {
    super(entity, settings, container);
    this.row_count = 0;
    this.col_count = 0;
    this.Create();
  }

  Create() {
    var grid_area = this.Create_Element({
      id: this.entity.id + "_grid_area",
      type: "div",
      css: {
        "position": "absolute",
        "left": String(this.entity.x + 1) + "px",
        "top": String(this.entity.y + 1) + "px",
        "width": String(this.entity.width - 2) + "px",
        "height": String(this.entity.height - 2) + "px",
        "overflow-y": "scroll",
        "background-color": (this.settings["bg-color"]) ? this.settings["bg-color"] : "silver"
      }
    }, this.container);
    // Load up table.
    if (this.settings["file"]) {
      this.Load_Table(this.settings["file"]);
    }
    else if (this.settings["rows"] && this.settings["columns"]) {
      this.Create_Blank_Table(parseInt(this.settings["rows"]), parseInt(this.settings["columns"]));
    }
  }

  /**
   * Loads a table from a file.
   * @param name The name of the table file to load.
   */
  Load_Table(name) {
    // Now load the new table.
    var component = this;
    Load_File("Database/" + name, function(data) {
      component.Build_View(data);
    });
  }

  /**
   * Creates a blank table of rows and columns.
   * @param rows The number of rows in the table.
   * @param columns The number of columns in the table.
   */
  Create_Blank_Table(rows, columns) {
    var data = [];
    for (var row_index = 0; row_index < rows; row_index++) {
      var cols = [];
      for (var col_index = 0; col_index < columns; col_index++) {
        cols.push("");
      }
      data.push(cols.join("\t"));
    }
    this.Build_View(data.join("\n"));
  }

  /**
   * Gets the value of a cell at a specific coordinate.
   * @param x The column coordinate.
   * @param y The row coordinate.
   * @return The value at the location.
   * @throws An error if the coordinate are invalid.
   */
  Get_Value(x, y) {
    var value = "";
    if (this.elements[this.entity.id + "_cell_field_" + y + "_" + x] != undefined) {
      value = this.elements[this.entity.id + "_cell_field_" + y + "_" + x].value;
    }
    else {
      throw "Invalid coordinates for cell value.";
    }
    return value;
  }

  /**
   * Sets a value to a specific cell given the coordinates.
   * @param x The x coordinate of the cell. 
   * @param y The y coordinate of the cell. 
   * @param value The value to set at the cell.
   * @throws An error if the cell does not exist.
   */
  Set_Value(x, y, value) {
    if (this.elements[this.entity.id + "_cell_field_" + y + "_" + x] != undefined) {
      this.elements[this.entity.id + "_cell_field_" + y + "_" + x].value = value;
    }
    else {
      throw "Invalid coordinates for cell value.";
    }
  }

  /**
   * Gets the tab delimited data from the table.
   * @return The table data string from all the cells.
   */
  Get_Table_Data() {
    var data = [];
    var row_count = this.row_count;
    var col_count = this.col_count;
    for (var row_index = 0; row_index < row_count; row_index++) {
      var row = [];
      for (var col_index = 0; col_index < col_count; col_index++) {
        row.push(this.Get_Value(col_index, row_index));
      }
      data.push(row.join("\t"));
    }
    return data.join("\n");
  }

  /**
   * Sets the data to the existing cells of the table.
   * @param data The tab delimited table data.
   */
  Set_Table_Data(data) {
    var rows = Split(data);
    var row_count = (rows.length > this.row_count) ? this.row_count : rows.length;
    this.Clear(); // Clear out old data.
    for (var row_index = 0; row_index < row_count; row_index++) {
      var columns = rows[row_index].split(/\t/);
      var col_count = (columns.length > this.col_count) ? this.col_count : columns.length;
      for (var col_index = 0; col_index < col_count; col_index++) {
        this.Set_Value(col_index, row_index, columns[col_index]);
      }
    }
  }

  /**
   * Clears out the grid view.
   */
  Clear() {
    var row_count = this.row_count;
    var col_count = this.col_count;
    for (var row_index = 0; row_index < row_count; row_index++) {
      for (var col_index = 0; col_index < col_count; col_index++) {
        this.Set_Value(col_index, row_index, "");
      }
    }
  }

  /**
   * Builds a grid view using tab delimited data.
   * @param data The tab delimited table data.
   * @throws An error if the column count is invalid.
   */
  Build_View(data) {
    // Clear out container of any table.
    this.Remove_Elements(this.elements[this.entity.id + "_grid_area"]);
    // Build up grid.
    var rows = Split(data);
    var row_count = rows.length;
    this.row_count = row_count; // Record the row count.
    for (var row_index = 0; row_index < row_count; row_index++) {
      var cells = rows[row_index].split(/\t/);
      var cell_count = cells.length;
      if (this.col_count > 0) {
        if (cell_count != this.col_count) {
          throw "Column size is not consistent.";
        }
      }
      this.col_count = cell_count; // Record the cell count.
      var cell_width = 100 / cell_count;
      var row_element = this.Create_Element({
        id: this.entity.id + "_row_" + row_index,
        type: "div",
        css: {
          "width": "calc(100% - 2px)",
          "border": "1px dotted black",
          "border-bottom": (row_index == (row_count - 1)) ? "1px dotted black" : "0",
          "height": "24px"
        }
      }, this.entity.id + "_grid_area");
      for (var cell_index = 0; cell_index < cell_count; cell_index++) {
        var cell = cells[cell_index];
        var cell_element = this.Create_Element({
          id: this.entity.id + "_cell_" + row_index + "_" + cell_index,
          type: "div",
          css: {
            "width": "calc(" + cell_width + "% - 1px)",
            "height": "100%",
            "border-right": (cell_index == (cell_count - 1)) ? "0" : "1px dotted black",
            "float": "left",
            "line-height": "24px",
            "position": "relative"
          },
          subs: [
            this.Make_Form(this.entity.id + "_cell_form_" + row_index + "_" + cell_index, [
              this.Make_Field(this.entity.id + "_cell_field_" + row_index + "_" + cell_index, {
                "type": "text",
                "fg-color": "black",
                "bg-color": "transparent",
                "height": 24,
                "value": cell,
                "border": "none"
              })
            ])
          ]
        }, row_element);
      }
    }
  }

}

/**
 * This component allows comics to be read page by page with the click
 * of a button.
 *
 * Properties are as follows:
 *
 * name - The base name of the comic files. i.e. "Trail_Hogs"
 */
class cComic_Reader extends cComponent {

  constructor(entity, settings, container) {
    super(entity, settings, container);
    this.page_no = 1;
    this.Create();
  }
  
  Create() {
    var page_area = this.Create_Element({
      id: this.entity.id,
      type: "div",
      css: {
        "position": "absolute",
        "left": String(this.entity.x + 1) + "px",
        "top": String(this.entity.y + 1) + "px",
        "width": String(this.entity.width - 2) + "px",
        "height": String(this.entity.height - 2) + "px"
      },
      subs: [
        {
          id: this.entity.id + "_image",
          type: "img",
          attrib: {
            "width": "100%",
            "height": "100%",
            "src": this.Get_Page_Image()
          },
          css: {
            "width": "100%",
            "height": "100%"
          }
        }
      ]
    }, this.container);
    var component = this;
    this.elements[this.entity.id + "_image"].onerror = function() {
      if (component.page_no > 1) {
        component.Go_To_Page(-1); // Go back to last good page.
      }
    };
    this.elements[this.entity.id + "_image"].onload = function() {
      // Store page position.
      localStorage.setItem(component.settings["name"] + "_comic_page", component.page_no);
    };
    this.Remember_Page();
  }
  
  /**
   * Remembers the last page you were on and goes to it otherwise
   * it goes to the first page.
   */
  Remember_Page() {
    // Load saved page.
    if (localStorage.getItem(this.settings["name"] + "_comic_page") != null) {
      var page_no = parseInt(localStorage.getItem(this.settings["name"] + "_comic_page"));
      this.Move_To_Page(page_no);
    }
    else {
      this.Move_To_Page(1);
    }
  }
  
  /**
   * Goes to a page forwards or backwards depending on provided
   * value.
   * @param direction 1 or -1 for proper navigation.
   */
  Go_To_Page(direction) {
    this.page_no += direction;
    if (this.page_no < 1) {
      this.page_no = 1;
    }
    this.elements[this.entity.id + "_image"].src = this.Get_Page_Image();
  }
  
  /**
   * Goes directly to a page given the page number.
   * @param page_no The page number to go to.
   */
  Move_To_Page(page_no) {
    this.page_no = page_no;
    if (this.page_no < 1) {
      this.page_no = 1;
    }
    this.elements[this.entity.id + "_image"].src = this.Get_Page_Image();
  }
  
  /**
   * Gets the page image.
   * @return The page image file.
   */
  Get_Page_Image() {
    return Get_Image(this.settings["name"] + "_Page_" + this.page_no + ".png", false, "Books");
  }
  
  /**
   * Sets the name of the comic to load.
   * @param name The name of the comic. This resets the page number.
   */
  Set_Name(name) {
    this.settings["name"] = name;
    this.Remember_Page();
  }

}

/**
 * This is a code editor component, complete with a browser used
 * for Codeloader's Code Bank.
 */
class cCode_Editor extends cComponent {

  constructor(entity, settings, container) {
    super(entity, settings, container);
    this.GRAPHIC_W = 16;
    this.CHAR_W = 8;
    this.CHAR_H = 16;
    this.TAB_CHAR = "  "; // 2 Spaces
    this.lines = [];
    this.cursor_x = 0;
    this.cursor_y = 0;
    this.shift_start = -1;
    this.shift_end = -1;
    this.shift_mode = 0; // Shift key was held down.
    this.columns = 0;
    this.rows = 0;
    this.selection_started = false;
    this.opened_file = "";
    this.code_files = {
      "js": true,
      "cpp": true,
      "hpp": true,
      "c": true,
      "xml": true,
      "html": true,
      "css": true,
      "script": true,
      "clsh": true,
      "pl": true,
      "sh": true,
      "java": true,
      "json": true,
      "txt": true,
      "init": true,
      "pic": true,
      "ent": true,
      "map": true,
      "bkg": true,
      "scene": true,
      "py": true,
      "bm": true
    };
    this.selection_start = {
      x: -1,
      y: -1
    };
    this.selection_end = {
      x: -1,
      y: -1
    };
    this.keywords = {
      "clsh": [
        "define",
        "as",
        "label",
        "var",
        "list",
        "alloc",
        "test",
        "set",
        "to",
        "at",
        "move",
        "remark",
        "end",
        "and",
        "or",
        "rem",
        "cat",
        "rand",
        "sin",
        "cos",
        "tan",
        "eq",
        "ne",
        "lt",
        "gt",
        "le",
        "ge",
        "stop",
        "output",
        "call",
        "return",
        "import"
      ],
      "script": [
        "define",
        "as",
        "label",
        "var",
        "list",
        "alloc",
        "test",
        "set",
        "to",
        "at",
        "move",
        "remark",
        "end",
        "and",
        "or",
        "rem",
        "cat",
        "rand",
        "sin",
        "cos",
        "tan",
        "eq",
        "ne",
        "lt",
        "gt",
        "le",
        "ge",
        "stop",
        "output",
        "call",
        "return",
        "import"
      ],
      "cpp": [
        "alignas",
        "alignof",
        "and",
        "and_eq",
        "asm",
        "atomic_cancel",
        "atomic_commit",
        "atomic_noexcept",
        "auto",
        "bitand",
        "bitor",
        "bool",
        "break",
        "case",
        "catch",
        "char",
        "char8_t",
        "char16_t",
        "char32_t",
        "class",
        "compl",
        "concept",
        "const",
        "consteval",
        "constexpr",
        "constinit",
        "const_cast",
        "continue",
        "co_await",
        "co_return",
        "co_yield",
        "decltype",
        "default",
        "delete",
        "do",
        "double",
        "dynamic_cast",
        "else",
        "enum",
        "explicit",
        "export",
        "extern",
        "false",
        "float",
        "for",
        "friend",
        "goto",
        "if",
        "inline",
        "int",
        "long",
        "mutable",
        "namespace",
        "new",
        "noexcept",
        "not",
        "not_eq",
        "nullptr",
        "operator",
        "or",
        "or_eq",
        "private",
        "protected",
        "public",
        "reflexpr",
        "register",
        "reinterpret_cast",
        "requires",
        "return",
        "short",
        "signed",
        "sizeof",
        "static",
        "static_assert",
        "static_cast",
        "struct",
        "switch",
        "synchronized",
        "template",
        "this",
        "thread_local",
        "throw",
        "true",
        "try",
        "typedef",
        "typeid",
        "typename",
        "union",
        "unsigned",
        "using",
        "virtual",
        "void",
        "volatile",
        "wchar_t",
        "while",
        "xor",
        "xor_eq"
      ],
      "hpp": [
        "alignas",
        "alignof",
        "and",
        "and_eq",
        "asm",
        "atomic_cancel",
        "atomic_commit",
        "atomic_noexcept",
        "auto",
        "bitand",
        "bitor",
        "bool",
        "break",
        "case",
        "catch",
        "char",
        "char8_t",
        "char16_t",
        "char32_t",
        "class",
        "compl",
        "concept",
        "const",
        "consteval",
        "constexpr",
        "constinit",
        "const_cast",
        "continue",
        "co_await",
        "co_return",
        "co_yield",
        "decltype",
        "default",
        "delete",
        "do",
        "double",
        "dynamic_cast",
        "else",
        "enum",
        "explicit",
        "export",
        "extern",
        "false",
        "float",
        "for",
        "friend",
        "goto",
        "if",
        "inline",
        "int",
        "long",
        "mutable",
        "namespace",
        "new",
        "noexcept",
        "not",
        "not_eq",
        "nullptr",
        "operator",
        "or",
        "or_eq",
        "private",
        "protected",
        "public",
        "reflexpr",
        "register",
        "reinterpret_cast",
        "requires",
        "return",
        "short",
        "signed",
        "sizeof",
        "static",
        "static_assert",
        "static_cast",
        "struct",
        "switch",
        "synchronized",
        "template",
        "this",
        "thread_local",
        "throw",
        "true",
        "try",
        "typedef",
        "typeid",
        "typename",
        "union",
        "unsigned",
        "using",
        "virtual",
        "void",
        "volatile",
        "wchar_t",
        "while",
        "xor",
        "xor_eq"
      ],
      "c": [
        "auto",
        "break",
        "case",
        "char",
        "const",
        "continue",
        "default",
        "do",
        "double",
        "else",
        "enum",
        "extern",
        "float",
        "for",
        "goto",
        "if",
        "inline",
        "int",
        "long",
        "register",
        "restrict",
        "return",
        "short",
        "signed",
        "sizeof",
        "static",
        "struct",
        "switch",
        "typedef",
        "union",
        "unsigned",
        "void",
        "volatile",
        "while",
        "_Alignas",
        "_Alignof",
        "_Atomic",
        "_Bool",
        "_Complex",
        "_Generic",
        "_Imaginary",
        "_Noreturn",
        "_Static_assert",
        "_Thread_local"
      ],
      "h": [
        "auto",
        "break",
        "case",
        "char",
        "const",
        "continue",
        "default",
        "do",
        "double",
        "else",
        "enum",
        "extern",
        "float",
        "for",
        "goto",
        "if",
        "inline",
        "int",
        "long",
        "register",
        "restrict",
        "return",
        "short",
        "signed",
        "sizeof",
        "static",
        "struct",
        "switch",
        "typedef",
        "union",
        "unsigned",
        "void",
        "volatile",
        "while",
        "_Alignas",
        "_Alignof",
        "_Atomic",
        "_Bool",
        "_Complex",
        "_Generic",
        "_Imaginary",
        "_Noreturn",
        "_Static_assert",
        "_Thread_local"
      ],
      "js": [
        "abstract",
        "arguments",
        "await",
        "boolean",
        "break",
        "byte",
        "case",
        "catch",
        "char",
        "class",
        "const",
        "continue",
        "debugger",
        "default",
        "delete",
        "do",
        "double",
        "else",
        "enum",
        "eval",
        "export",
        "extends",
        "false",
        "final",
        "finally",
        "float",
        "for",
        "function",
        "goto",
        "if",
        "implements",
        "import",
        "in",
        "instanceof",
        "int",
        "interface",
        "let",
        "long",
        "native",
        "new",
        "null",
        "package",
        "private",
        "protected",
        "public",
        "return",
        "short",
        "static",
        "super",
        "switch",
        "synchronized",
        "this",
        "throw",
        "throws",
        "transient",
        "true",
        "try",
        "typeof",
        "var",
        "void",
        "volatile",
        "while",
        "with",
        "yield",
        "self"
      ],
      "py": [
        "and",
        "as",
        "assert",
        "break",
        "class",
        "continue",
        "def",
        "del",
        "elif",
        "else",
        "except",
        "False",
        "finally",
        "for",
        "from",
        "global",
        "if",
        "import",
        "in",
        "is",
        "lambda",
        "None",
        "nonlocal",
        "not",
        "or",
        "pass",
        "raise",
        "return",
        "True",
        "try",
        "while",
        "with",
        "yield"
      ]
    };
    this.key_map = {
      "Space":        "  ", // Space
      "Digit0":       "0)", // Numbers
      "Digit1":       "1!",
      "Digit2":       "2@",
      "Digit3":       "3#",
      "Digit4":       "4$",
      "Digit5":       "5%",
      "Digit6":       "6^",
      "Digit7":       "7&",
      "Digit8":       "8*",
      "Digit9":       "9(",
      "KeyA":         "aA", // Letters
      "KeyB":         "bB",
      "KeyC":         "cC",
      "KeyD":         "dD",
      "KeyE":         "eE",
      "KeyF":         "fF",
      "KeyG":         "gG",
      "KeyH":         "hH",
      "KeyI":         "iI",
      "KeyJ":         "jJ",
      "KeyK":         "kK",
      "KeyL":         "lL",
      "KeyM":         "mM",
      "KeyN":         "nN",
      "KeyO":         "oO",
      "KeyP":         "pP",
      "KeyQ":         "qQ",
      "KeyR":         "rR",
      "KeyS":         "sS",
      "KeyT":         "tT",
      "KeyU":         "uU",
      "KeyV":         "vV",
      "KeyW":         "wW",
      "KeyX":         "xX",
      "KeyY":         "yY",
      "KeyZ":         "zZ",
      "Backquote":    "`~", // Special Characters
      "Minus":        "-_",
      "Equal":        "=+",
      "BracketLeft":  "[{",
      "BracketRight": "]}",
      "Backslash":    "\\|",
      "Semicolon":    ";:",
      "Quote":        "'\"",
      "Comma":        ",<",
      "Period":       ".>",
      "Slash":        "/?"
    };
    this.Create();
  }

  Create() {
    // Add offscreen text element for input. Here so it is not visible.
    var input = this.Create_Element({
      id: this.entity.id + "_text_input_form",
      type: "form",
      attrib: {
        action: ""
      },
      css: {
        "position": "absolute",
        "left": String(this.entity.x + 10) + "px",
        "top": String(this.entity.y + 10) + "px",
        "width": "64px",
        "height": "32px"
      },
      subs: [
        {
          id: this.entity.id + "_text_input",
          type: "textarea",
          attrib: {
            rows: 5,
            cols: 25,
            wrap: "off"
          },
          css: {
            "position": "absolute",
            "width": "64px",
            "height": "32px"
          }
        }
      ]
    }, this.container);
    var text_metrics = this.Create_Element({
      id: this.entity.id + "_text_metric",
      type: "canvas",
      attrib: {
        width: 100,
        height: 100
      },
      css: {
        "position": "absolute",
        "left": String(this.entity.x + 10) + "px",
        "top": String(this.entity.y + 10) + "px",
        "width": "100px",
        "height": "100px",
        "color": "transparent"
      }
    }, this.container);
    // Augment character width.
    var text_canvas = text_metrics.getContext("2d");
    text_canvas.font = "16px monospace";
    this.CHAR_W = text_canvas.measureText("X").width;
    // Create the editor layout.
    var edit = this.Create_Element({
      id: this.entity.id + "_border",
      type: "div",
      css: {
        "position": "absolute",
        "left": String(this.entity.x + 1) + "px",
        "top": String(this.entity.y + 1) + "px",
        "width": String(this.entity.width - 2) + "px",
        "height": String(this.entity.height - 2) + "px",
        "background-color": "white"
      },
      subs: [
        {
          id: this.entity.id + "_viewport",
          type: "div",
          template: "panel",
          css: {
            "position": "absolute",
            "left": "4px",
            "top": "4px",
            "width": "calc(100% - 8px)",
            "height": "calc(100% - 8px)",
            "color": "black",
            "background-color": "white",
            "font-family": "monospace",
            "font-size": "16px",
            "white-space": "pre",
            "line-height": "1em",
            "overflow": "hidden"
          }
        },
        {
          id: this.entity.id + "_cursor_area",
          type: "div",
          css: {
            "position": "absolute",
            "left": "4px",
            "top": "4px",
            "width": "calc(100% - 8px)",
            "height": "calc(100% - 8px)",
            "color": "red",
            "background-color": "transparent",
            "font-family": "monospace",
            "font-size": "16px",
            "white-space": "pre",
            "line-height": "1em",
            "overflow": "hidden",
            "opacity": "0.5",
            "cursor": String(Get_Image("Lettering.png", true) + ", default")
          }
        },
        this.Make_Loading_Sign(),
        this.Make_Saving_Sign()
      ]
    }, this.container);
    // Resize the viewport.
    this.columns = Math.floor((this.entity.width - 8 - 2) / this.CHAR_W);
    this.rows = Math.floor((this.entity.height - 8 - 2) / this.CHAR_H);
    // Add blank line.
    this.lines.push("");
    // Render this line.
    this.Render();
    // Initialize handlers.
    var component = this;
    this.Init_Loading_Click();
    this.Init_Saving_Click();
    this.elements[this.entity.id + "_cursor_area"].addEventListener("click", function(event) {
      component.elements[component.entity.id + "_text_input"].focus();
    }, false);
    this.elements[this.entity.id + "_cursor_area"].addEventListener("mousedown", function(event) {
      var mouse_x = (event.offsetX != undefined) ? event.offsetX : event.layerX;
      var mouse_y = (event.offsetY != undefined) ? event.offsetY : event.layerY;
      component.selection_start.x = Math.floor(mouse_x / component.CHAR_W);
      component.selection_start.y = Math.floor(mouse_y / component.CHAR_H);
      component.shift_start = component.selection_start.y;
      component.selection_started = true;
    }, false);
    this.elements[this.entity.id + "_cursor_area"].addEventListener("mouseup", function(event) {
      var mouse_x = (event.offsetX != undefined) ? event.offsetX : event.layerX;
      var mouse_y = (event.offsetY != undefined) ? event.offsetY : event.layerY;
      component.selection_end.x = Math.floor(mouse_x / component.CHAR_W);
      component.selection_end.y = Math.floor(mouse_y / component.CHAR_H);
      var selection_width = (component.selection_end.x - component.selection_start.x) + 1;
      var selection_height = (component.selection_end.y - component.selection_start.y) + 1;
      if ((component.selection_start.x != -1) && (component.selection_start.y != -1)) {
        if ((selection_width == 1) && (selection_height == 1)) {
          component.selection_start.x = -1;
          component.selection_start.y = -1;
          // Set cursor coordinates.
          var viewport_coords = component.Get_Viewport_Coords();
          component.cursor_x = viewport_coords.x + component.selection_end.x;
          component.cursor_y = viewport_coords.y + component.selection_end.y;
          component.Validate_Cursor();
        }
        else {
          component.Copy_Selection();
        }
        component.Render();
      }
      component.shift_end = component.selection_end.y;
      component.selection_started = false;
    }, false);
    this.elements[this.entity.id + "_cursor_area"].addEventListener("mousemove", function(event) {
      if (component.selection_started) {
        var mouse_x = (event.offsetX != undefined) ? event.offsetX : event.layerX;
        var mouse_y = (event.offsetY != undefined) ? event.offsetY : event.layerY;
        component.selection_end.x = Math.floor(mouse_x / component.CHAR_W);
        component.selection_end.y = Math.floor(mouse_y / component.CHAR_H);
        if ((component.selection_start.x != -1) && (component.selection_start.y != -1)) {
          component.Render();
        }
      }
    }, false);
    this.elements[this.entity.id + "_cursor_area"].addEventListener("wheel", function(event) {
      var scroll = (event.deltaY != undefined) ? event.deltaY : 0;
      if (scroll < 0) {
        if (component.cursor_y >= component.rows) {
          component.cursor_y -= component.rows; // Scroll one screen up.
        }
      }
      else if (scroll > 0) {
        if (component.cursor_y < (component.lines.length - component.rows)) {
          component.cursor_y += component.rows;
        }
      }
      component.Render();
    }, false);
    this.elements[this.entity.id + "_text_input"].addEventListener("keydown", function(event) {
      var key = event.code;
      if (key == "Enter") { // Return/Enter
        // Count off indenting spaces in previous line.
        var padding = component.lines[component.cursor_y].match(/^\s+/);
        if (!padding) {
          padding = ""; // We need to do component to avoid an issue with arrays not liking NULL values.
        }
        else {
          padding = padding[0];
        }
        // If the cursor is at the beginning of the file insert before otherwise insert after.
        if ((component.cursor_x == 0) && (component.cursor_y == 0)) {
          var before = component.lines.slice(0, component.cursor_y);
          var after = component.lines.slice(component.cursor_y);
          component.lines = before.concat(padding, after);
        }
        else {
          var before = component.lines.slice(0, component.cursor_y + 1);
          var after = component.lines.slice(component.cursor_y + 1);
          component.lines = before.concat(padding, after);
          component.cursor_y++;
        }
        component.cursor_x = padding.length;
      }
      else if (key == "Backspace") { // Backspace
        // Does not delete last character if out of bounds.
        if (component.cursor_x > 0) {
          // Delete
          var before = component.lines[component.cursor_y].slice(0, component.cursor_x - 1);
          var after = component.lines[component.cursor_y].slice(component.cursor_x);
          component.lines[component.cursor_y] = before + after;
          component.cursor_x--;
        }
        else {
          // Take the entire line and move it to the previous line.
          if (component.cursor_y > 0) { // Make sure there are lines.
            var prev_line = component.lines[component.cursor_y];
            // Delete component line.
            var before = component.lines.slice(0, component.cursor_y);
            var after = component.lines.slice(component.cursor_y + 1);
            component.lines = before.concat(after);
            component.cursor_y--; // Decrease cursor position.
            var current_length = component.lines[component.cursor_y].length;
            // Add the lines.
            component.lines[component.cursor_y] += prev_line;
            // Place x cursor at end of previous line.
            component.cursor_x = current_length;
          }
        }
      }
      else if (key == "Delete") { // Delete
        component.elements[component.entity.id + "_save_btn"].style.opacity = "1";
        if ((component.selection_start.x != -1) && (component.selection_start.y != -1)) {
          // We'll delete the selection.
          var viewport_coords = component.Get_Viewport_Coords();
          var number_of_lines = component.selection_end.y - component.selection_start.y + 1;
          if (number_of_lines > 0) {
            component.lines.splice(viewport_coords.y + component.selection_start.y, number_of_lines);
            // Deselect the area.
            component.selection_start.x = -1;
            component.selection_start.y = -1;
            component.Render();
          }
        }
        else {
          // We'll delete an entire line here.
          if (component.cursor_y > 0) { // Not the first line.
            if (component.cursor_y == (component.lines.length - 1)) { // Last line.
              component.lines = component.lines.slice(0, component.lines.length - 1);
              component.cursor_y--; // Decrease cursor y coordinate.
            }
            else { // Other line but not first.
              var before = component.lines.slice(0, component.cursor_y);
              var after = component.lines.slice(component.cursor_y + 1);
              component.lines = before.concat(after);
            }
          }
          else { // First line.
            if (component.lines.length > 1) {
              component.lines = component.lines.slice(component.cursor_y + 1);
            }
            else {
              component.lines[component.cursor_y] = ""; // Just clear it out.
            }
          }
        }
        component.cursor_x = 0; // Reset cursor.
      }
      else if (key == "ArrowLeft") { // Left
        if (component.cursor_x > 0) {
          component.cursor_x--;
        }
      }
      else if (key == "ArrowRight") { // Right
        // We can move one character out of bounds.
        if (component.cursor_x < component.lines[component.cursor_y].length) {
          component.cursor_x++;
        }
      }
      else if (key == "ArrowUp") { // Up
        // Don't change cursor x position unless we do so.
        if (component.cursor_y > 0) {
          component.cursor_y--;
          if (component.lines[component.cursor_y].length > 0) {
            if (component.cursor_x >= component.lines[component.cursor_y].length) {
              component.cursor_x = component.lines[component.cursor_y].length - 1;
            }
          }
          else {
            component.cursor_x = 0;
          }
        }
      }
      else if (key == "ArrowDown") { // Down
        if (component.cursor_y < (component.lines.length - 1)) {
          component.cursor_y++;
          if (component.lines[component.cursor_y].length > 0) {
            if (component.cursor_x >= component.lines[component.cursor_y].length) {
              component.cursor_x = component.lines[component.cursor_y].length - 1;
            }
          }
          else {
            component.cursor_x = 0;
          }
        }
      }
      else if (key == "Home") { // Home
        component.cursor_x = 0;
      }
      else if (key == "End") { // End
        if (component.lines[component.cursor_y].length > 0) {
          component.cursor_x = component.lines[component.cursor_y].length - 1;
        }
      }
      else if (key == "Tab") { // Tab
        var before = component.lines[component.cursor_y].slice(0, component.cursor_x);
        var after = component.lines[component.cursor_y].slice(component.cursor_x);
        component.lines[component.cursor_y] = before + component.TAB_CHAR + after;
        component.cursor_x += component.TAB_CHAR.length;
      }
      else if (key == "PageUp") { // Page Up
        if (component.cursor_y >= component.rows) {
          component.cursor_y -= component.rows; // Scroll one screen up.
        }
      }
      else if (key == "PageDown") { // Page Down
        if (component.cursor_y < (component.lines.length - component.rows)) {
          component.cursor_y += component.rows;
        }
      }
      else if (key.match(/Shift/))  { // Shift
        component.shift_mode = 1;
      }
      else { // Character Keys
        if (component.lines.length == 0) { // Insert blank line.
          component.lines.push("");
          component.cursor_x = 0;
          component.cursor_y = 0;
        }
        var before = component.lines[component.cursor_y].slice(0, component.cursor_x);
        var after = component.lines[component.cursor_y].slice(component.cursor_x);
        // Whoa? Do we have an actual character?
        if (component.key_map[key] != undefined) {
          var character = component.key_map[key].substr(component.shift_mode, 1);
          component.lines[component.cursor_y] = before + character + after;
          component.cursor_x++;
        }
      }
      // Render here.
      component.Render();
    }, false);
    this.elements[this.entity.id + "_text_input"].addEventListener("keyup", function(event) {
      var key = event.keyCode;
      if (key == 16) {
        component.shift_mode = 0;
      }
    }, false);
  }

  /**
   * Loads a file into the editor.
   * @param file The file to load into the editor.
   */
  Load(file) {
    var untabbed_lines = file.lines.slice(0); // Create copy of lines.
    var line_count = untabbed_lines.length;
    if (line_count > 0) {
      var parts = file.name.split(/\//);
      this.opened_file = parts.pop(); // No path information.
      this.lines = [];
      for (var line_index = 0; line_index < line_count; line_index++) {
        // Convert all tabs to spaces.
        var line = untabbed_lines[line_index].replace(/\t/g, this.TAB_CHAR);
        this.lines.push(line);
      }
      this.cursor_x = 0;
      this.cursor_y = 0;
      // Render
      this.Render();
    }
    else { // Assign blank line.
      this.opened_file = "";
      this.lines = [ "" ];
      this.cursor_x = 0;
      this.cursor_y = 0;
    }
  }

  /**
   * Saves a file from the editor.
   * @param file The name of the file to save.
   */
  Save(file) {
    // Now save the code.
    file.lines = this.lines.slice(0);
  }

  /**
   * Clears out the editor.
   */
  Clear() {
    // Clear out the rest.
    this.lines = [ "" ];
    this.cursor_x = 0;
    this.cursor_y = 0;
    // Clear selection.
    this.selection_start.x = -1;
    this.selection_start.y = -1;
    this.selection_started = false;
    // Render.
    this.Render();
  }

  /**
   * Renders the editor viewport.
   */
  Render() {
    var viewport_coords = this.Get_Viewport_Coords();
    var html = "";
    var cursor_dx = this.cursor_x - viewport_coords.x;
    var cursor_dy = this.cursor_y - viewport_coords.y;
    var cursor_disp = "";
    for (var screen_y = 0; screen_y < this.rows; screen_y++) {
      var line_index = viewport_coords.y + screen_y;
      // Check for valid line index.
      if (line_index < this.lines.length) {
        html += String(this.lines[line_index].substr(viewport_coords.x, this.columns) + "\n");
      }
      // Render the cursor.
      for (var screen_x = 0; screen_x < this.columns; screen_x++) {
        if ((this.selection_start.x == -1) && (this.selection_start.y == -1)) {
          // Do cursor highlighting.
          if ((cursor_dx == screen_x) && (cursor_dy == screen_y)) {
            cursor_disp += "&block;";
          }
          else {
            cursor_disp += " ";
          }
        }
        else if ((screen_x >= this.selection_start.x) && (screen_x <= this.selection_end.x) &&
                (screen_y >= this.selection_start.y) && (screen_y <= this.selection_end.y)) {
          cursor_disp += "&block;";
        }
        else {
          cursor_disp += " ";
        }
      }
      cursor_disp += "\n";
    }
    // Replace entities.
    html = html.replace(/&/g, "&amp;")
               .replace(/</g, "&lt;")
               .replace(/>/g, "&gt;");
    // Highlight syntax.
    html = this.Highlight_Syntax(html);
    // Update viewport display.
    this.elements[this.entity.id + "_viewport"].innerHTML = html;
    // Update cursor display.
    this.elements[this.entity.id + "_cursor_area"].innerHTML = cursor_disp;
  }

  /**
   * Gets the viewport coordinates. The return object looks like this:
   * %
   * {
   *   x: 0,
   *   y: 0,
   *   half_screen_x: 0,
   *   half_screen_y: 0
   * }
   * %
   * @return The object containing viewport coordinates.
   */
  Get_Viewport_Coords() {
    var viewport_x = 0;
    var half_screen_x = Math.floor(this.columns / 2);
    if ((this.cursor_x >= 0) && (this.cursor_x < half_screen_x)) {
      viewport_x = 0;
    }
    else {
      viewport_x = this.cursor_x - half_screen_x;
    }
    var viewport_y = 0;
    var half_screen_y = Math.floor(this.rows / 2);
    if ((this.cursor_y >= 0) && (this.cursor_y < half_screen_y)) {
      viewport_y = 0;
    }
    else {
      viewport_y = this.cursor_y - half_screen_y;
    }
    return {
      x: viewport_x,
      y: viewport_y,
      half_screen_x: half_screen_x,
      half_screen_y: half_screen_y
    };
  }

  /**
   * Maps all code to various line addresses.
   * @param file The name of the file to map.
   * @return The hash representing the code map.
   */
  Code_Map(file) {
    var parts = file.name.split(/\//);
    var fname = parts.pop(); // No path info.
    var ext = fname.replace(/^\w+\./, "");
    var map = {};
    // Add label to start of file.
    label = "- start of file -";
    map[label] = 0;
    var class_name = "";
    // Parse out all subprograms.
    var line_count = this.lines.length;
    for (var line_index = 0; line_index < line_count; line_index++) {
      var line = this.lines[line_index];
      // Parse out labels.
      if (line.match(/^\s*label\s+\w+\s*$/)) {
        var label = line.replace(/^\s*label\s+(\w+)\s*$/, "$1");
        map[label] = line_index;
      }
      if (line.match(/^\s*label\s+\w+\.\S+\s*$/)) { // A sub-label.
        var label = line.replace(/^\s*label\s+(\w+\.\S+)\s*$/, "$1");
        map[label] = line_index;
      }
      // Parse out JavaScript functions.
      if (ext.match(/js/)) {
        if (line.match(/^\s*function\s+\w+\([^\)]*\)\s*\{\s*$/)) {
          var label = line.replace(/^\s*function\s+(\w+)\([^\)]*\)\s*\{\s*$/, "$1");
          map[label] = line_index;
        }
        // Parse out JavaScript classes and methods.
        if (line.match(/^\s*class\s+\w+\s+(extends\s+\w+\s+|)\{\s*$/)) {
          var label = line.replace(/^\s*class\s+(\w+)\s+(extends\s+\w+\s+|)\{\s*$/, "[$1]");
          map[label] = line_index;
          class_name = label;
        }
        if (line.match(/^\s*\w+\([^\)]*\)\s+\{\s*$/)) {
          var label = line.replace(/^\s*(\w+)\([^\)]*\)\s+\{\s*$/, "$1");
          var inside_routine = line.replace(/^\s*\w+\(([^\)]*)\)\s+\{\s*$/, "$1");
          if (!inside_routine.match(/function/)) {
            if (class_name.length > 0) {
              map[class_name + ":" + label] = line_index;
            }
            else {
              map[label] = line_index;
            }
          }
        }
        if (line.match(/^\s*\w+:\s+function\([^\)]*\)\s+\{\s*$/)) {
          var label = line.replace(/^\s*(\w+):\s+function\([^\)]*\)\s+\{\s*$/, "$1");
          map[label] = line_index;
        }
      }
      // Parse C/C++ functions and methods.
      if (ext.match(/c|cpp|hpp/)) {
        if (line.match(/^\s*\S+\s+\w+\([^\)]*\)(\s+\{|)\s*$/)) {
          var label = line.replace(/^\s*\S+\s+(\w+)\([^\)]*\)(\s+\{|)\s*$/, "$1");
          map[label] = line_index;
        }
        if (line.match(/^\s*\S+\s+\w+::\w+\([^\)]*\)(\s+\{|)\s*$/)) {
          var label = line.replace(/^\s*\S+\s+\w+::(\w+)\([^\)]*\)(\s+\{|)\s*$/, "$1");
          map[label] = line_index;
        }
        // Parse C++ classes.
        if (line.match(/^\s*class\s+\w+\s+\{\s*$/)) {
          var label = line.replace(/^\s*class\s+(\w+)\s+\{\s*$/, "[$1]");
          map[label] = line_index;
        }
        if (line.match(/^\s*class\s+\w+\s+:\s+public\s+\w+\s+\{\s*$/)) {
          var label = line.replace(/^\s*class\s+(\w+)\s+:\s+public\s+\w+\s+\{\s*$/, "[$1]");
          map[label] = line_index;
        }
        if (line.match(/^\s*struct\s+\w+\s+\{\s*$/)) {
          var label = line.replace(/^\s*struct\s+(\w+)\s+\{\s*$/, "[$1]");
          map[label] = line_index;
        }
      }
      // Parse Python functions and methods.
      if (ext.match(/py/)) {
        if (line.match(/^\s*def\s+\w+\([^\)]*\):\s*$/)) {
          var label = line.replace(/^\s*def\s+(\w+)\([^\)]*\):\s*$/, "$1");
          map[label] = line_index;
        }
        // Parse out Python classes.
        if (line.match(/^\s*class\s+\w+\(?[^\)]*\)?:\s*$/)) {
          var label = line.replace(/^\s*class\s+(\w+)\(?[^\)]*\)?:\s*$/, "[$1]");
          map[label] = line_index;
        }
      }
    }
    // Add label to end of file.
    label = "- end of file -";
    map[label] = line_count - 1;
    return map;
  }

  /**
   * Goes to a particular line.
   * @param The line number to go to. It is zero based.
   */
  Go_To_Line(line_no) {
    this.cursor_x = 0;
    this.cursor_y = line_no;
    this.Render();
  }

  /**
   * Highlights syntax given code.
   * @param code The code string to highlight.
   * @return The formatted code with HTML.
   */
  Highlight_Syntax(code) {
    // Replace all keywords.
    var name = this.opened_file;
    if (this.opened_file.match(/^\w+\.\w+$/)) { // Make sure there is extension.
      var ext = this.opened_file.replace(/^\w+\./, "");
      if (this.keywords[ext] != undefined) {
        // Replace C-Lesh comment.
        code = code.replace(/(\bremark\b\s+)(.*)(\s+\bend\b)/mg, "$1<comment>$2</comment>$3");
        /*
        code = code.replace(/^remark/g, "remark<comment>")
                  .replace(/(\s+remark)/g, "$1<comment>")
                  .replace(/end$/g, "</comment>end")
                  .replace(/(end\s+)/g, "</comment>$1");
        */
        // Replace C style comment.
        code = code.replace(/(\/\/\s+)(.*)(\n)/g, "<comment>$1$2</comment>$3");
        // Replace C style multiline comment.
        code = code.replace(/(\/\*)/g, "<comment>$1")
                  .replace(/(\*\/)/g, "$1</comment>");
        // Replace Perl style comment.
        code = code.replace(/(#\s+)(.*)(\n)/g, "<comment>$1$2</comment>$3");
        // Now replace keywords.
        var keyword_count = this.keywords[ext].length;
        var end = "(\\s+|\\r|\\n|\\[|\\}|\\[|\\{|\\(|\\)|\\.|\\;|\\,|\\:|\\*|\\-|\\!|\\&)";
        for (var keyword_index = 0; keyword_index < keyword_count; keyword_index++) {
          var keyword = this.keywords[ext][keyword_index];
          code = code.replace(new RegExp("^" + keyword + end, "g"), "<keyword>" + keyword + "</keyword>$1")
                     .replace(new RegExp(end + keyword + "$", "g"), "$1<keyword>" + keyword + "</keyword>")
                     .replace(new RegExp(end + keyword + end, "g"), "$1<keyword>" + keyword + "</keyword>$2");
        }
        // Replace strings entities.
        code = code.replace(/\\'/g, "\\&apos;")
                   .replace(/\\"/g, "\\&quot;");
        // Replace strings, single and double quoted.
        code = code.replace(/'([^'\n\r]*)'/g, "<string>&apos;$1&apos;</string>")
                   .replace(/"([^"\n\r]*)"/g, '<string>&quot;$1&quot;</string>');
        // Replace namespaces and addresses.
        code = code.replace(/(\s+|\[)(\w+)(\.\w+)/g, "$1<namespace>$2</namespace>$3")
                   .replace(/(#\S+)/g, "<address>$1</address>");
        // Replace markers with real HTML.
        code = code.replace(/<keyword>/g, '<span class="codeloader_keyword">')
                   .replace(/<comment>/g, '<span class="codeloader_comment">')
                   .replace(/<string>/g, '<span class="codeloader_string">')
                   .replace(/<namespace>/g, '<span class="codeloader_namespace">')
                   .replace(/<address>/g, '<span class="codeloader_address">')
                   .replace(/(<\/keyword>|<\/comment>|<\/string>|<\/namespace>|<\/address>)/g, "</span>");
      }
    }
    return code;
  }

  /**
   * Copies a selection using the saved selection coordinates.
   */
  Copy_Selection() {
    if ((this.selection_start.x != -1) && (this.selection_start.y != -1)) { // We have a selection.
      var viewport_coords = this.Get_Viewport_Coords();
      var line_count = this.selection_end.y - this.selection_start.y + 1;
      var copy_lines = [];
      for (var y = this.selection_start.y; y <= this.selection_end.y; y++) {
        var line_y = y + viewport_coords.y;
        if (line_y < 0) {
          line_y = 0;
        }
        if (line_y > (this.lines.length - 1)) {
          line_y = this.lines.length - 1;
        }
        var line = this.lines[line_y];
        var end_x = this.selection_end.x;
        if (end_x < 0) {
          end_x = 0;
        }
        if (end_x > (line.length - 1)) {
          end_x = line.length - 1;
        }
        var segment = line.slice(this.selection_start.x + viewport_coords.x, end_x + viewport_coords.x + 1);
        if (line_count > 1) { // Do this if the number of lines is more than 1.
          segment = line; // Copy whole line.
        }
        copy_lines.push(segment);
      }
      localStorage.setItem("copy_lines", copy_lines.join("\n"));
    }
  }

  /**
   * Validates if the cursor is in the right area.
   */
  Validate_Cursor() {
    // Validate cursor coordinates.
    if (this.cursor_y >= this.lines.length) {
      this.cursor_y = this.lines.length - 1;
    }
    if (this.cursor_y < 0) {
      this.cursor_y = 0;
    }
    if (this.cursor_x >= this.lines[this.cursor_y].length) {
      this.cursor_x = this.lines[this.cursor_y].length - 1;
    }
    if (this.cursor_x < 0) {
      this.cursor_x = 0;
    }
  }

  /**
   * Copies an entire routine.
   */
  Copy_Routine() {
    var line_count = this.lines.length;
    var start_line = this.cursor_y;
    var copy_lines = [];
    for (var line_index = start_line; line_index < line_count; line_index++) {
      var line = this.lines[line_index];
      if (line.match(/^\s*this./)) { // All spaces?
        break;
      }
      copy_lines.push(line);
    }
    localStorage.setItem("copy_lines", copy_lines.join("\n"));
  }

}

/**
 * A subframe inside of a page where other HTML pages can be loaded.
 */
class cFrame extends cComponent {

  constructor(entity, settings, container) {
    super(entity, settings, container);
    this.Create();
  }

  Create() {
    var layout = this.Create_Element({
      id: this.entity.id + "_frame",
      type: "iframe",
      attrib: {
        src: "",
        title: "API Documentation"
      },
      css: {
        "position": "absolute",
        "left": String(this.entity.x + 1) + "px",
        "top": String(this.entity.y + 1) + "px", 
        "width": String(this.entity.width - 2) + "px",
        "height": String(this.entity.height - 2) + "px",
        "margin": "0",
        "padding": "0",
        "border": "none"
      }
    }, this.container);
  }

  /**
   * Loads an HTML page into the frame.
   * @param name The name of the HTML page.
   */
  Load(name) {
    this.elements[this.entity.id + "_frame"].src = name + ".html";
  }

}

/**
 * Allows editing of bump maps.
 */
class cBump_Map_Editor extends cComponent {

  constructor(entity, settings, container) {
    super(entity, settings, container);
    this.canvas = null;
    this.box = {
      left: 0,
      top: 0,
      right: 15,
      bottom: 15
    };
    this.sprite = new Image();
    this.sprite_loaded = false;
    this.corner_hit = "";
    this.Create();
  }

  Create() {
    this.canvas = this.Create_Element({
      id: this.entity.id,
      type: "canvas",
      attrib: {
        width: this.entity.width - 2,
        height: this.entity.height - 2
      },
      css: {
        "position": "absolute",
        "left": String(this.entity.x + 1) + "px",
        "top": String(this.entity.y + 1) + "px",
        "width": String(this.entity.width - 2) + "px",
        "height": String(this.entity.height - 2) + "px"
      }
    }, this.container);
    this.surface = this.canvas.getContext("2d");
    this.Render();
    var component = this;
    this.canvas.addEventListener("mousedown", function(event) {
      var mouse_x = event.offsetX;
      var mouse_y = event.offsetY;
      component.corner_hit = "";
      if ((mouse_x >= (component.box.left - 4)) && (mouse_x <= (component.box.left + 4)) && (mouse_y >= (component.box.top - 4)) && (mouse_y <= (component.box.top + 4))) {
        // We're in left-top box.
        component.corner_hit = "left-top";
        var width = component.box.right - component.box.left + 1;
        var height = component.box.bottom - component.box.top + 1;
        component.box.left = mouse_x;
        component.box.top = mouse_y;
        component.box.right = component.box.left + width - 1;
        component.box.bottom = component.box.top + height - 1;
        component.Render();
      }
      else if ((mouse_x >= (component.box.right - 4)) && (mouse_x <= (component.box.right + 4)) && (mouse_y >= (component.box.top - 4)) && (mouse_y <= (component.box.top + 4))) {
        // We're in right-top box.
        component.corner_hit = "right-top";
        if (component.box.right > component.box.left) {
          component.box.right = mouse_x;
          component.Render();
        }
      }
      else if ((mouse_x >= (component.box.right - 4)) && (mouse_x <= (component.box.right + 4)) && (mouse_y >= (component.box.bottom - 4)) && (mouse_y <= (component.box.bottom + 4))) {
        // We're in right-bottom box.
        component.corner_hit = "right-bottom";
        if ((component.box.right > component.box.left) && (component.box.bottom > component.box.top)) {
          component.box.right = mouse_x;
          component.box.bottom = mouse_y;
          component.Render();
        }
      }
      else if ((mouse_x >= (component.box.left - 4)) && (mouse_x <= (component.box.left + 4)) && (mouse_y >= (component.box.bottom - 4)) && (mouse_y <= (component.box.bottom + 4))) {
        // We're in left-bottom box.
        component.corner_hit = "left-bottom";
        if (component.box.bottom > component.box.top) {
          component.box.bottom = mouse_y;
          component.Render();
        }
      }
    }, false);
    this.canvas.addEventListener("mouseup", function(event) {
      component.corner_hit = ""; // Release corner.
    }, false);
    this.canvas.addEventListener("mouseout", function(event) {
      component.corner_hit = ""; // Release corner.
    }, false);
    this.canvas.addEventListener("mouseleave", function(event) {
      component.corner_hit = ""; // Release corner.
    }, false);
    this.canvas.addEventListener("mousemove", function(event) {
      var mouse_x = event.offsetX;
      var mouse_y = event.offsetY;
      if (component.corner_hit == "left-top") {
        var width = component.box.right - component.box.left + 1;
        var height = component.box.bottom - component.box.top + 1;
        component.box.left = mouse_x;
        component.box.top = mouse_y;
        component.box.right = component.box.left + width - 1;
        component.box.bottom = component.box.top + height - 1;
        component.Render();
      }
      else if (component.corner_hit == "right-top") {
        if (component.box.right > component.box.left) {
          component.box.right = mouse_x;
          component.Render();
        }
      }
      else if (component.corner_hit == "right-bottom") {
        if ((component.box.right > component.box.left) && (component.box.bottom > component.box.top)) {
          component.box.right = mouse_x;
          component.box.bottom = mouse_y;
          component.Render();
        }
      }
      else if (component.corner_hit == "left-bottom") {
        if (component.box.bottom > component.box.top) {
          component.box.bottom = mouse_y;
          component.Render();
        }
      }
    }, false);
  }

  /**
   * Renders the rectangle onto the canvas.
   */
  Render() {
    this.surface.fillStyle = "white";
    this.surface.fillRect(0, 0, this.canvas.width, this.canvas.height);
    if (this.sprite_loaded) {
      this.surface.drawImage(this.sprite, 0, 0);
    }
    this.surface.fillStyle = "lime";
    this.surface.globalAlpha = 0.5;
    var width = this.box.right - this.box.left + 1;
    var height = this.box.bottom - this.box.top + 1;
    this.surface.fillRect(this.box.left, this.box.top, width, height);
    // Draw corners.
    this.surface.globalAlpha = 1.0;
    this.surface.strokeStyle = "blue";
    this.surface.strokeRect(this.box.left - 4, this.box.top - 4, 9, 9);
    this.surface.strokeRect(this.box.left - 4, this.box.bottom - 4, 9, 9);
    this.surface.strokeRect(this.box.right - 4, this.box.top - 4, 9, 9);
    this.surface.strokeRect(this.box.right - 4, this.box.bottom - 4, 9, 9);
  }

  /**
   * Loads a bump map.
   * @param bump_map The bump map object.
   */
  Load(bump_map) {
    this.box.left = bump_map.left;
    this.box.top = bump_map.top;
    this.box.right = bump_map.right;
    this.box.bottom = bump_map.bottom;
    this.Render();
  }

  /**
   * Saves a bump map.
   * @param bump_map The bump map object to save to.
   */
  Save(bump_map) {
    bump_map.left = this.box.left;
    bump_map.top = this.box.top;
    bump_map.right = this.box.right;
    bump_map.bottom = this.box.bottom;
    this.Render();
  }

  /**
   * Loads a sprite into the background.
   * @param name The name of the sprite.
   */
  Load_Sprite(name) {
    var component = this;
    this.sprite.src = "Graphics/" + name + ".png";
    this.sprite_loaded = false;
    this.sprite.onload = function() {
      component.sprite_loaded = true;
      component.Render();
    };
  }

  /**
   * Clears out the bump map editor.
   */
  Clear() {
    this.surface.fillStyle = "white";
    this.surface.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

}

/**
 * A component that allows you to edit sound tracks.
 * 
 * Properties are as follows:
 * 
 * file - The file containing the names of the sound samples.
 */
class cSound_Editor extends cComponent {

  DEFAULT_ROWS = 10;
  DEFAULT_COLS = 10 * 4; // 1/4 second beat.
  CELL_W = 16;
  CELL_H = 16;

  constructor(entity, settings, container) {
    super(entity, settings, container);
    // Allocate grid size for 10 second track which will be default. There
    // will be 5 tracks by default.
    this.grid = [];
    for (var row_index = 0; row_index < this.DEFAULT_ROWS; row_index++) {
      var row = [];
      for (var col_index = 0; col_index < this.DEFAULT_COLS; col_index++) {
        row.push("");
      }
      this.grid.push(row);
    }
    this.pos = 0.0; // In seconds.
    this.scroll_x = 0;
    this.scroll_y = 0;
    this.sound_palette = {};
    this.timer = null;
    this.sounds_loaded = false;
    this.sound_block_loaded = false;
    this.sel_sound = "";
    this.Create();
  }

  Create() {
    var component = this;
    this.canvas = this.Create_Element({
      id: this.entity.id,
      type: "canvas",
      attrib: {
        width: this.entity.width - 26,
        height: this.entity.height - 26
      },
      css: {
        "position": "absolute",
        "left": String(this.entity.x + 1) + "px",
        "top": String(this.entity.y + 1) + "px",
        "width": String(this.entity.width - 26) + "px",
        "height": String(this.entity.height - 26) + "px"
      }
    }, this.container);
    this.surface = this.canvas.getContext("2d");
    // Create scrollers.
    var h_scroller_form = this.Create_Element({
      id: this.entity.id + "_h_scroller_form",
      type: "form",
      attrib: {
        action: ""
      },
      css: {
        "position": "absolute",
        "left": String(this.entity.x + 1) + "px",
        "top": String(this.entity.y + (this.entity.height - 2) - 24) + "px",
        "width": String(this.entity.width - 26) + "px",
        "height": "24px",
        "margin": "0",
        "padding": "0",
        "overflow": "hidden"
      },
      subs: [
        {
          id: this.entity.id + "_h_scroller",
          type: "input",
          attrib: {
            type: "range",
            min: 0,
            max: this.DEFAULT_COLS * 10, // 100 seconds.
            step: 1,
            value: 0
          },
          css: {
            "width": "100%",
            "height": "100%",
            "margin": "0",
            "padding": "0"
          }
        }
      ]
    }, this.container);
    this.h_scroller = h_scroller_form.firstChild;
    this.h_scroller.addEventListener("input", function(event) {
      component.scroll_x = event.target.value * component.CELL_W;
      component.Render();
    }, false);
    var v_scroller_form = this.Create_Element({
      id: this.entity.id + "_v_scroller_form",
      type: "form",
      attrib: {
        action: ""
      },
      css: {
        "position": "absolute",
        "left": String(this.entity.x + (this.entity.width - 2) - 24) + "px",
        "top": String(this.entity.y + 1) + "px",
        "width": "24px",
        "height": String(this.entity.height - 26) + "px",
        "margin": "0",
        "padding": "0",
        "overflow": "hidden"
      },
      subs: [
        {
          id: this.entity.id + "_v_scroller",
          type: "input",
          attrib: {
            type: "range",
            min: 0,
            max: this.DEFAULT_ROWS,
            step: 1,
            value: 0
          },
          css: {
            "width": String(this.entity.height - 26) + "px",
            "height": "24px",
            "transform": "rotate(90deg) translate(0, -24px)",
            "transform-origin": "0 0",
            "margin": "0",
            "padding": "0"
          }
        }
      ]
    }, this.container);
    this.v_scroller = v_scroller_form.firstChild;
    this.v_scroller.addEventListener("input", function(event) {
      component.scroll_y = event.target.value * component.CELL_H;
      component.Render();
    }, false);
    // Add the sound stack.
    this.sound_stack = this.Create_Element({
      id: this.entity.id + "_sound_stack",
      type: "div",
      css: {
        "position": "absolute",
        "left": "-2000px",
        "top": "0"
      }
    }, this.container);
    // Add default sound block icon.
    this.sound_block = new Image();
    this.sound_block.src = Get_Image("Sound_Block.png", false);
    this.sound_block.onload = function() {
      component.sound_block_loaded = true;
    };
    // Add mouse handlers for canvas.
    this.canvas.addEventListener("click", function(event) {
      var mouse_x = event.offsetX;
      var mouse_y = event.offsetY;
      // Check to see which cell was clicked.
      var row_count = component.grid.length;
      for (var row_index = 0; row_index < row_count; row_index++) {
        var row = component.grid[row_index];
        var col_count = row.length;
        for (var col_index = 0; col_index < col_count; col_index++) {
          var sound = row[col_index];
          var bump_map = {
            left: col_index * (component.CELL_W + 1) - component.scroll_x,
            top: row_index * (component.CELL_H + 1) - component.scroll_y,
            right: (col_index * (component.CELL_W + 1)) + component.CELL_W - component.scroll_x,
            bottom: (row_index * (component.CELL_H + 1)) + component.CELL_H - component.scroll_y
          };
          if ((mouse_x >= bump_map.left) && (mouse_x <= bump_map.right) && (mouse_y >= bump_map.top) && (mouse_y <= bump_map.bottom)) {
            if (sound.length > 0) {
              row[col_index] = "";
            }
            else {
              row[col_index] = component.sel_sound;
              component.Play_Sound(component.sel_sound);
            }
            component.Render();
            break;
          }
        }
      }
    }, false);
  }

  /**
   * Loads the sound palette.
   * @param name The name of the sound palette.
   */
  Load_Sound_Palette(name) {
    var component = this;
    this.sounds_loaded = false;
    Load_File("Sounds/" + name + ".txt", function(data) {
      var sounds = Split(data);
      // Clean out sound stack.
      component.Remove_Elements(component.sound_stack);
      component.Load_Sound(sounds, 0, function() {
        component.sounds_loaded = true;
      });
    });
  }

  /**
   * Loads a collection of sounds into the sound stack.
   * @param sounds The array of sounds to be loaded. 
   * @param index The index of the sound in the array to load. 
   * @param on_load Called when all the sounds have been loaded. 
   */
  Load_Sound(sounds, index, on_load) {
    var component = this;
    if (index < sounds.length) {
      var name = sounds[index];
      var icon = new Image();
      icon.src = Get_Image(name + ".png", false);
      icon.onload = function() {
        var audio = component.Create_Element({
          id: component.entity.id + "_sound_" + name,
          type: "audio",
          subs: [
            {
              id: component.entity.id + "_sound_source_wav_" + name,
              type: "source",
              attrib: {
                src: "Sounds/" + name + ".wav",
                type: "audio/wav"
              }
            }
          ]
        }, component.sound_stack);
        component.sound_palette[name] = {
          icon: icon,
          sound: audio
        };
        // Try to force loading of the sound.
        audio.load();
        if ($browser.name == "firefox") {
          component.Load_Sound(sounds, index + 1, on_load);
        }
        else {
          audio.addEventListener("canplaythrough", function() {
            component.Load_Sound(sounds, index + 1, on_load);
          }, false);
        }
      }
    }
    else {
      on_load();
    }
  }

  /**
   * Renders the sound grid.
   */
  Render() {
    if (this.sounds_loaded) {
      // Clear the canvas.
      this.surface.globalAlpha = 1.0;
      this.surface.fillStyle = "white";
      this.surface.fillRect(0, 0, this.canvas.width, this.canvas.height);
      // Grab grid dimensions.
      var row_count = this.grid.length;
      var col_count = this.grid[0].length;
      // Draw black box.
      this.surface.fillStyle = "black";
      this.surface.fillRect(0 - this.scroll_x, 0 - this.scroll_y, col_count * (this.CELL_W + 1) + 1, row_count * (this.CELL_H + 1) + 1);
      // Draw the grid boxes and icons.
      for (var row_index = 0; row_index < row_count; row_index++) {
        for (var col_index = 0; col_index < col_count; col_index++) {
          var x = col_index * (this.CELL_W + 1) + 1 - this.scroll_x;
          var y = row_index * (this.CELL_H + 1) + 1 - this.scroll_y;
          var sound = this.grid[row_index][col_index];
          if (this.sound_block_loaded) {
            this.surface.drawImage(this.sound_block, x, y);
          }
          if (this.sound_palette[sound] != undefined) {
            this.surface.drawImage(this.sound_palette[sound].icon, x, y);
          }
        }
      }
      // Highlight current position.
      this.surface.fillStyle = "yellow";
      this.surface.globalAlpha = 0.5;
      var pos = Math.floor(this.pos * 4) * (this.CELL_W + 1) + 1 - this.scroll_x;
      this.surface.fillRect(pos, 0 - this.scroll_y, this.CELL_W, (this.CELL_H + 1) * row_count + 1);
    }
  }

  /**
   * Sets the position in seconds or fractions of.
   * @param pos The position in fractional seconds. This is a string.
   */
  Set_Position(pos) {
    this.pos = parseFloat(pos);
    var time_end = this.grid[0].length * 0.25;
    if (this.pos < 0.0) {
      this.pos = 0.0;
    }
    if (this.pos >= time_end) {
      this.pos = time_end - 0.25;
    }
    this.Render();
  }

  /**
   * Plays the sound tracks.
   * @param on_play Called for every note played on the track. The time is passed in.
   */
  Play(on_play) {
    if (!this.timer && this.sounds_loaded) { // Track stopped?
      var component = this;
      var time_end = this.grid[0].length * 0.25;
      this.timer = setInterval(function() {
        if (component.pos < time_end) {
          // Play the audio column.
          var track_count = component.grid.length;
          var col_index = Math.floor(component.pos * 4);
          for (var track_index = 0; track_index < track_count; track_index++) {
            var sound = component.grid[track_index][col_index];
            component.Play_Sound(sound);
          }
          component.Render();
          on_play(component.pos);
          component.pos += 0.25;
        }
        else {
          component.Stop();
          component.pos = 0.0;
          component.Render();
        }
      }, 250); // 1/4 a second interval.
    }
  }

  /**
   * Stops the track.
   */
  Stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      this.Render();
    }
  }

  /**
   * Clears the track.
   */
  Clear() {
    this.Stop();
    this.pos = 0.0;
    var row_count = this.grid.length;
    for (var row_index = 0; row_index < row_count; row_index++) {
      var col_count = this.grid[row_index].length;
      for (var col_index = 0; col_index < col_count; col_index++) {
        this.grid[row_index][col_index] = "";
      }
    }
    this.Render();
  }

  /**
   * Resizes the track to the time length.
   * @param time_length The length of time to resize the track to. 
   */
  Resize(time_length) {
    var row_count = this.grid.length;
    var col_count = Math.floor(time_length * 4);
    for (var row_index = 0; row_index < row_count; row_index++) {
      this.grid[row_index] = [];
      for (var col_index = 0; col_index < col_count; col_index++) {
        this.grid[row_index].push("");
      }
    }
    this.Render();
  }

  /**
   * Loads a track from a file.
   * @param name The name of the track.
   * @param on_load Called when the track is loaded the track time length is passed in.
   * @param on_error Called if the track was not loaded.
   */
  Load_Track(name, on_load, on_error) {
    var component = this;
    // Stop the track if it is playing.
    this.Stop();
    this.pos = 0.0;
    Load_File("Tracks/" + name + ".txt", function(data) {
      var tracks = Split(data);
      var track_count = tracks.length;
      // Recreate grid to accomodate track.
      component.grid = [];
      var time_length = 0.0;
      for (var track_index = 0; track_index < track_count; track_index++) {
        var sounds = tracks[track_index].split(/,/);
        var sound_count = sounds.length;
        time_length = sound_count * 0.25;
        component.grid.push([]);
        for (var sound_index = 0; sound_index < sound_count; sound_index++) {
          var sound = sounds[sound_index];
          component.grid[track_index].push(sound);
        }
      }
      component.Render();
      // Callback with time passed in.
      on_load(time_length);
    }, function() {
      on_error();
    });
  }

  /**
   * Saves a track into a file.
   * @param name The name of the file to save the track into.
   */
  Save_Track(name) {
    var track_count = this.grid.length;
    var data = [];
    for (var track_index = 0; track_index < track_count; track_index++) {
      var track = this.grid[track_index];
      data.push(track.join(","));
    }
    Save_File("Tracks/" + name + ".txt", data.join("\n"), function(message) {
      console.log(message);
    });
  }

  /**
   * Gets the time length of the track.
   * @return The length of in seconds.
   */
  Get_Time_Length() {
    return (this.grid[0].length * 0.25);
  }

  /**
   * Plays a sound sample from the sound palette.
   * @param name The name of the sound.
   */
  Play_Sound(name) {
    if (this.sound_palette[name] != undefined) {
      var sound = this.sound_palette[name].sound;
      sound.currentTime = 0;
      sound.play();
    }
  }

}

/**
 * Creates a fully functional message board. The board may be read but only
 * written if the editor code is provided. The properties are as follows:
 *
 * - font - The font to use for the forum.
 */
class cBoard extends cComponent {

  constructor(entity, settings, container) {
    super(entity, settings, container);
    this.current_thread = "";
    this.current_post = "";
    this.Create();
  }
  
  Create() {
    var board = this.Create_Element({
      id: this.entity.id + "_topic_board",
      type: "div",
      css: {
        "position": "absolute",
        "left": this.entity.x + "px",
        "top": this.entity.y + "px",
        "width": this.entity.width + "px",
        "height": this.entity.height + "px",
        "background-color": "#f7fbff"
      },
      subs: [
        {
          id: this.entity.id + "_topic_area",
          type: "div",
          css: {
            "margin": "1px",
            "margin-top": "32px",
            "padding": "4px",
            "width": "calc(100% - 10px)",
            "height": "calc(100% - 41px)",
            "overflow-y": "scroll",
            "overflow-x": "hidden",
            "font-family": this.settings["font"] || "Regular, sans-serif",
            "font-size": "16px",
            "color": "black",
            "background-color": "white"
          }
        },
        this.Make_Button(this.entity.id + "_new_topic", {
          "top": 1,
          "right": 4,
          "width": 100,
          "height": 30,
          "bg-color": "#25cc76",
          "fg-color": "white",
          "label": "New Topic"
        }),
        this.Make_Button(this.entity.id + "_reply_post", {
          "top": 1,
          "right": 4,
          "width": 100,
          "height": 30,
          "bg-color": "#25cc76",
          "fg-color": "white",
          "label": "Reply"
        }),
        this.Make_Button(this.entity.id + "_disp_topics", {
          "top": 1,
          "right": 108,
          "width": 100,
          "height": 30,
          "bg-color": "#3f8ee8",
          "fg-color": "white",
          "label": "Topics"
        }),
        this.Make_Button(this.entity.id + "_manual", {
          "top": 1,
          "right": 108,
          "width": 100,
          "height": 30,
          "bg-color": "#3f8ee8",
          "fg-color": "white",
          "label": "Manual"
        })
      ]
    }, this.container);
    var component = this;
    // Create handlers for buttons.
    this.elements[this.entity.id + "_new_topic"].addEventListener("click", function(event) {
      component.Toggle_Topic_Form(true);
    }, false);
    this.elements[this.entity.id + "_reply_post"].addEventListener("click", function(event) {
      component.Toggle_Post_Form(true);
    }, false);
    this.elements[this.entity.id + "_disp_topics"].addEventListener("click", function(event) {
      component.Toggle_Board(true);
    }, false);
    this.elements[this.entity.id + "_manual"].addEventListener("click", function(event) {
      open("Wiki_Manual.html", component.entity.id + "_manual", "width=320,height=320,location=off,menubar=off,status=off,toolbar=off,resizable=off");
    }, false);
    var reply_box = this.Create_Element({
      id: this.entity.id + "_topic_reply_box",
      type: "div",
      css: {
        "position": "absolute",
        "left": this.entity.x + "px",
        "top": this.entity.y + "px",
        "width": this.entity.width + "px",
        "height": this.entity.height + "px",
        "background-color": "#f7fbff",
        "display": "none"
      },
      subs: [
        {
          id: this.entity.id + "_screen_name_area",
          type: "div",
          css: {
            "margin": "1px",
            "margin-top": "32px",
            "width": "calc(100% - 2px)",
            "height": "32px",
            "position": "relative"
          },
          subs: [
            this.Make_Form(this.entity.id + "_screen_name_form", [
              this.Make_Field(this.entity.id + "_screen_name", {
                "label": "Enter screen name.",
                "height": 24
              })
            ])
          ]
        },
        {
          id: this.entity.id + "_reply_area",
          type: "div",
          css: {
            "margin": "1px",
            "margin-top": "1px",
            "width": "calc(100% - 2px)",
            "height": "calc(100% - 34px)",
            "position": "relative"
          },
          subs: [
            {
              id: this.entity.id + "_topic_form_area",
              type: "div",
              css: {
                "width": "100%",
                "height": "30px",
                "position": "relative",
                "display": "none"
              },
              subs: [
                this.Make_Form(this.entity.id + "_topic_form", [
                  this.Make_Field(this.entity.id + "_topic_title", {
                    "label": "Enter topic here.",
                    "height": 24
                  })
                ])
              ]
            },
            {
              id: this.entity.id + "_post_form_area",
              type: "div",
              css: {
                "width": "100%",
                "height": "calc(100% - 96px)",
                "position": "relative",
                "display": "none"
              },
              subs: [
                this.Make_Form(this.entity.id + "_post_form", [
                  this.Make_Edit(this.entity.id + "_topic_post", {
                    "label": "Type in post here."
                  })
                ])
              ]
            }
          ]
        },
        this.Make_Button(this.entity.id + "_post_topic", {
          "top": 1,
          "right": 4,
          "width": 100,
          "height": 30,
          "bg-color": "#3f8ee8",
          "fg-color": "white",
          "label": "Post"
        }),
        this.Make_Button(this.entity.id + "_cancel_topic", {
          "top": 1,
          "right": 108,
          "width": 100,
          "height": 30,
          "bg-color": "#25cc76",
          "fg-color": "white",
          "label": "Cancel"
        }),
        this.Make_Button(this.entity.id + "_post_reply", {
          "top": 1,
          "right": 4,
          "width": 100,
          "height": 30,
          "bg-color": "#3f8ee8",
          "fg-color": "white",
          "label": "Post"
        }),
        this.Make_Button(this.entity.id + "_cancel_reply", {
          "top": 1,
          "right": 108,
          "width": 100,
          "height": 30,
          "bg-color": "#25cc76",
          "fg-color": "white",
          "label": "Cancel"
        }),
        this.Make_Button(this.entity.id + "_post_edit", {
          "top": 1,
          "right": 4,
          "width": 100,
          "height": 30,
          "bg-color": "#3f8ee8",
          "fg-color": "white",
          "label": "Edit"
        }),
        this.Make_Button(this.entity.id + "_cancel_edit", {
          "top": 1,
          "right": 108,
          "width": 100,
          "height": 30,
          "bg-color": "#25cc76",
          "fg-color": "white",
          "label": "Cancel"
        })
      ]
    }, this.container);
    // Add handlers for buttons.
    this.elements[this.entity.id + "_post_topic"].addEventListener("click", function(event) {
      component.Post_Topic(component.elements[component.entity.id + "_screen_name"],
                           component.elements[component.entity.id + "_topic_title"],
                           component.elements[component.entity.id + "_topic_post"],
                           function() {
                             component.Toggle_Topic_Form(false);
                             component.Toggle_Board(true);
                           });
    }, false);
    this.elements[this.entity.id + "_cancel_topic"].addEventListener("click", function(event) {
      component.Toggle_Topic_Form(false);
      component.Toggle_Board(true);
    }, false);
    this.elements[this.entity.id + "_post_reply"].addEventListener("click", function(event) {
      component.Post_Reply(component.current_thread,
                           component.elements[component.entity.id + "_screen_name"],
                           component.elements[component.entity.id + "_topic_title"],
                           component.elements[component.entity.id + "_topic_post"],
                           function() {
                             component.Toggle_Post_Form(false);
                             component.Toggle_Thread(true, component.current_thread);
                           });
    }, false);
    this.elements[this.entity.id + "_cancel_reply"].addEventListener("click", function(event) {
      component.Toggle_Post_Form(false);
      component.Toggle_Thread(true, component.current_thread);
    }, false);
    this.elements[this.entity.id + "_post_edit"].addEventListener("click", function(event) {
      component.Post_Edit(component.current_post,
                          component.elements[component.entity.id + "_screen_name"],
                          component.elements[component.entity.id + "_topic_post"],
                          function() {
                            component.Toggle_Edit_Form(false);
                            component.Toggle_Thread(true, component.current_thread);
                          });
    }, false);
    this.elements[this.entity.id + "_cancel_edit"].addEventListener("click", function(event) {
      component.Toggle_Edit_Form(false);
      component.Toggle_Thread(true, component.current_thread);
    }, false);
    // Display the topics.
    this.Display_Topics();
  }
  
  /**
   * Removes the loaded topics allowing for garbage collection.
   */
  Remove_Topics(container) {
    var items = container.childNodes.slice(0);
    var item_count = items.length;
    for (var item_index = 0; item_index < item_count; item_index++) {
      var item = items[item_index];
      var id = item.id;
      container.removeChild(item);
      // Remove element reference for garbage collection.
      delete this.elements[id];
    }
  }
  
  /**
   * Displays all topics in the message board.
   */
  Display_Topics() {
    var component = this;
    // Show and hide necessary buttons.
    this.Show(this.entity.id + "_new_topic");
    this.Show(this.entity.id + "_manual");
    this.Hide(this.entity.id + "_disp_topics");
    this.Hide(this.entity.id + "_reply_post");
    Load_File("Board/Topics.txt", function(data) {
      component.Remove_Elements(component.elements[component.entity.id + "_topic_area"]);
      var topics = Split(data);
      topics.reverse();
      var topic_count = topics.length;
      for (var topic_index = 0; topic_index < topic_count; topic_index++) {
        var topic = topics[topic_index].split(/:/);
        var title = topic[0];
        var thread = topic[1];
        var status = topic[2];
        if (status == "deleted") {
          continue; // This topic is not to be displayed.
        }
        // Create topic link.
        var topic_link = component.Create_Element({
          id: component.entity.id + "_topic_link_" + topic_index,
          type: "div",
          text: title,
          css: {
            "width": "calc(100% - 2px)",
            "height": "24px",
            "margin": "1px",
            "color": "black",
            "position": "relative",
            "cursor": String(Get_Image("Cursor.png", true) + ", default"),
            "margin-bottom": "0",
            "border-bottom": "1px dashed #bfdcfd",
            "position": "relative"
          },
          subs: [
            {
              id: component.entity.id + "_topic_delete_" + topic_index,
              type: "div",
              css: {
                "position": "absolute",
                "right": "4px",
                "top": "4px",
                "width": "16px",
                "height": "16px",
                "background-image": Get_Image("Clear.png", true),
                "cursor": String(Get_Image("Cursor.png", true) + ", default")
              }
            }
          ]
        }, component.entity.id + "_topic_area");
        topic_link.f_thread_id = thread;
        // Add handlers for topic link.
        topic_link.addEventListener("click", function(event) {
          var link = event.target;
          if (link.f_thread_id) {
            component.current_thread = link.f_thread_id;
            component.Display_Posts(link.f_thread_id);
          }
        }, false);
        // Add for topic delete.
        component.elements[component.entity.id + "_topic_delete_" + topic_index].f_thread_id = thread;
        component.elements[component.entity.id + "_topic_delete_" + topic_index].addEventListener("click", function(event) {
          var link = event.target;
          component.Update_Topic(link.f_thread_id, "deleted");
          event.stopPropagation();
        }, false);
      }
    }, function(message) {
      component.Remove_Elements(component.elements[component.entity.id + "_topic_area"]);
      component.elements[component.entity.id + "_topic_area"].innerHTML = "No topics to display.";
    });
  }
  
  /**
   * Updates the status of a topic.
   * @param thread_id The ID of the thread associated with the topic.
   * @param status The status of the topic.
   */
  Update_Topic(thread_id, status) {
    var component = this;
    Load_File("Board/Topics.txt", function(data) {
      var topics = Split(data);
      var topic_count = topics.length;
      for (var topic_index = 0; topic_index < topic_count; topic_index++) {
        var topic = topics[topic_index].split(/:/);
        var title = topic[0];
        var thread = topic[1];
        var topic_status = topic[2];
        if (thread == thread_id) {
          topic_status = status;
          topic = title + ":" + thread + ":" + topic_status;
          topics[topic_index] = topic;
          break;
        }
      }
      // Write out changes.
      Save_File("Board/Topics.txt", topics.join("\n"), function(message) {
        // Reload the topics display.
        component.Toggle_Board(true);
      }, function(error) {
        component.Toggle_Board(true);
      });
    });
  }
  
  /**
   * Displays the posts associated with the topic.
   * @param thread_id The ID of the thread with the posts.
   */
  Display_Posts(thread_id) {
    var component = this;
    this.Show(this.entity.id + "_disp_topics");
    this.Show(this.entity.id + "_reply_post");
    this.Hide(this.entity.id + "_new_topic");
    this.Hide(this.entity.id + "_manual");
    Load_File("Board/Thread_" + thread_id + ".txt", function(data) {
      component.Remove_Elements(component.elements[component.entity.id + "_topic_area"]);
      // Extract posts from thread.
      var posts = Split(data);
      component.Render_Post(posts, 0);
    }, function(message) {
      component.Remove_Elements(component.elements[component.entity.id + "_topic_area"]);
      component.elements[component.entity.id + "_topic_area"].innerHTML = "No posts.";
    });
  }
  
  /**
   * Renders a post, one at a time, from an array.
   * @param posts The array of posts.
   * @param index The current index of the post.
   */
  Render_Post(posts, index) {
    if (index < posts.length) {
      var post = posts[index].split(/:/);
      var title = post[0];
      var author = post[1];
      var post_id = post[2];
      var component = this;
      Load_File("Board/Post_" + post_id + ".txt", function(body) {
        // Do the actual rendering of the post.
        var post_board = component.Create_Element({
          id: component.entity.id + "_post_board_" + index,
          type: "div",
          text: "@" + title + "@" + "*by " + author + "*\n\n" + body,
          css: {
            "padding": "4px",
            "margin": "1px",
            "margin-bottom": "8px",
            "width": "calc(100% - 10px)",
            "background-color": "#f7fbff",
            "color": "black",
            "box-shadow": "2px 2px 2px gray",
            "overflow": "auto"
          },
          subs: [
            component.Make_Button(component.entity.id + "_edit_post_" + index, {
              "label": "Edit",
              "bg-color": "#3a654f",
              "fg-color": "white",
              "right": 4,
              "top": 4,
              "width": 50,
              "height": 20,
              "opacity": 0.7
            })
          ]
        }, component.entity.id + "_topic_area");
        // Attach post ID.
        component.elements[component.entity.id + "_edit_post_" + index].f_post_id = post_id;
        // Handle edit click event.
        component.elements[component.entity.id + "_edit_post_" + index].addEventListener("click", function(event) {
          var pboard = event.target;
          if (pboard.f_post_id) {
            component.current_post = pboard.f_post_id;
            component.Toggle_Edit_Form(true, pboard.f_post_id);
          }
        }, false);
        // Display the next post.
        component.Render_Post(posts, index + 1);
      });
    }
  }
  
  /**
   * Toggles the message board display.
   * @param show True to show, false to hide.
   */
  Toggle_Board(show) {
    if (show) {
      this.Show(this.entity.id + "_topic_board");
      this.Show(this.entity.id + "_new_topic");
      this.Show(this.entity.id + "_manual");
      this.Hide(this.entity.id + "_topic_reply_box");
      this.Hide(this.entity.id + "_reply_post");
      this.Hide(this.entity.id + "_disp_topics");
      this.Display_Topics();
    }
    else {
      this.Hide(this.entity.id + "_topic_board");
      this.Show(this.entity.id + "_topic_reply_box");
    }
  }
  
  /**
   * Toggles the thread to display.
   * @param show True to show, false to hide.
   * @param thread_id The ID of the thread to display.
   */
  Toggle_Thread(show, thread_id) {
    if (show) {
      this.Show(this.entity.id + "_topic_board");
      this.Show(this.entity.id + "_reply_post");
      this.Show(this.entity.id + "_disp_topics");
      this.Hide(this.entity.id + "_new_topic");
      this.Hide(this.entity.id + "_topic_reply_box");
      this.Hide(this.entity.id + "_manual");
      this.Display_Posts(thread_id);
    }
    else {
      this.Hide(this.entity.id + "_topic_board");
      this.Show(this.entity.id + "_topic_reply_box");
    }
  }
  
  /**
   * Toggles the topic form.
   * @param show True to show, false to hide.
   */
  Toggle_Topic_Form(show) {
    if (show) {
      this.Show(this.entity.id + "_topic_reply_box");
      this.Show(this.entity.id + "_topic_form_area");
      this.Show(this.entity.id + "_post_form_area");
      this.Show(this.entity.id + "_post_topic");
      this.Show(this.entity.id + "_cancel_topic");
      this.Hide(this.entity.id + "_topic_board");
      this.Hide(this.entity.id + "_post_reply");
      this.Hide(this.entity.id + "_cancel_reply");
      this.Hide(this.entity.id + "_post_edit");
      this.Hide(this.entity.id + "_cancel_edit");
      // Set screen name.
      var screen_name = localStorage.getItem("screen_name");
      if (screen_name) {
        this.elements[this.entity.id + "_screen_name"].value = screen_name;
      }
      else {
        this.elements[this.entity.id + "_screen_name"].value = "";
      }
      // Clear out fields.
      this.elements[this.entity.id + "_topic_title"].value = "";
      this.elements[this.entity.id + "_topic_post"].value = "";
    }
    else {
      this.Hide(this.entity.id + "_topic_reply_box");
    }
  }
  
  /**
   * Toggles the post form.
   * @param show True to show, false to hide.
   */
  Toggle_Post_Form(show) {
    if (show) {
      this.Show(this.entity.id + "_topic_reply_box");
      this.Show(this.entity.id + "_post_form_area");
      this.Show(this.entity.id + "_topic_form_area");
      this.Show(this.entity.id + "_post_reply");
      this.Show(this.entity.id + "_cancel_reply");
      this.Hide(this.entity.id + "_topic_board");
      this.Hide(this.entity.id + "_post_topic");
      this.Hide(this.entity.id + "_cancel_topic");
      this.Hide(this.entity.id + "_post_edit");
      this.Hide(this.entity.id + "_cancel_edit");
      // Set screen name.
      var screen_name = localStorage.getItem("screen_name");
      if (screen_name) {
        this.elements[this.entity.id + "_screen_name"].value = screen_name;
      }
      else {
        this.elements[this.entity.id + "_screen_name"].value = "";
      }
      // Clear out fields.
      this.elements[this.entity.id + "_topic_title"].value = "";
      this.elements[this.entity.id + "_topic_post"].value = "";
    }
    else {
      this.Hide(this.entity.id + "_topic_reply_box");
    }
  }

  /**
   * Toggles a post form but with edit buttons and content displayed.
   * @param show True to show, false to hide.
   * @param post_id Identifies the post to edit.
   */  
  Toggle_Edit_Form(show, post_id) {
    if (show) {
      this.Show(this.entity.id + "_topic_reply_box");
      this.Show(this.entity.id + "_post_form_area");
      this.Show(this.entity.id + "_post_edit");
      this.Show(this.entity.id + "_cancel_edit");
      this.Hide(this.entity.id + "_topic_board");
      this.Hide(this.entity.id + "_topic_form_area");
      this.Hide(this.entity.id + "_post_reply");
      this.Hide(this.entity.id + "_cancel_reply");
      this.Hide(this.entity.id + "_post_topic");
      this.Hide(this.entity.id + "_cancel_topic");
      // Set screen name.
      var screen_name = localStorage.getItem("screen_name");
      if (screen_name) {
        this.elements[this.entity.id + "_screen_name"].value = screen_name;
      }
      else {
        this.elements[this.entity.id + "_screen_name"].value = "";
      }
      // Load post.
      var component = this;
      Load_File("Board/Post_" + post_id + ".txt", function(body) {
        component.elements[component.entity.id + "_topic_post"].value = body;
      }, function(error) {
        component.elements[component.entity.id + "_topic_post"].value = "";
      });
    }
    else {
      this.Hide(this.entity.id + "_topic_reply_box");
    }
  }
  
  /**
   * Posts a new topic to the board. Validation is performed too.
   * @param screen_name A screen name of your choosing to identify yourself.
   * @param topic_title A short description of the topic.
   * @param topic_post The body of the topic. This will be the first post.
   * @param on_post Called when topic is done posting.
   */
  Post_Topic(screen_name, topic_title, topic_post, on_post) {
    if ((screen_name.value.length > 0) && (topic_title.value.length > 0) && (topic_post.value.length > 0)) {
      localStorage.setItem("screen_name", screen_name.value);
      // Generate thread id and post id.
      var date = new Date();
      var thread_id = String_To_Hex(topic_title.value + date.getTime());
      var post_id = String_To_Hex(topic_title.value + date.getTime());
      // Add to topics file.
      Load_File("Board/Topics.txt", function(data) {
        var topics = Split(data);
        topics.push(topic_title.value + ":" + thread_id + ":active");
        Save_File("Board/Topics.txt", topics.join("\n"), function(message) {
          Save_File("Board/Thread_" + thread_id + ".txt", topic_title.value + ":" + screen_name.value + ":" + post_id, function(message) {
            Save_File("Board/Post_" + post_id + ".txt", topic_post.value, function(message) {
              on_post();
            }, function(error) {
              on_post();
            });
          }, function(error) {
            on_post();
          });
        }, function(error) {
          on_post();
        });
      }, function(error) {
        Save_File("Board/Topics.txt", topic_title.value + ":" + thread_id + ":active", function(message) {
          Save_File("Board/Thread_" + thread_id + ".txt", topic_title.value + ":" + screen_name.value + ":" + post_id, function(message) {
            Save_File("Board/Post_" + post_id + ".txt", topic_post.value, function(message) {
              on_post();
            }, function(error) {
              on_post();
            });
          }, function(error) {
            on_post();
          });
        }, function(error) {
          on_post();
        });
      });
    }
    else {
      if (screen_name.value.length == 0) {
        screen_name.focus();
      }
      if (topic_title.value.length == 0) {
        topic_title.focus();
      }
      if (topic_post.value.length == 0) {
        topic_post.focus();
      }
    }
  }
  
  /**
   * Posts a new reply to a thread. Validation is performed too.
   * @param thread_id The ID of the thread to post to.
   * @param screen_name A screen name of your choosing to identify yourself.
   * @param topic_title A short description of the reply.
   * @param topic_post The body of the reply.
   * @param on_post Called when reply is done posting.
   */
  Post_Reply(thread_id, screen_name, topic_title, topic_post, on_post) {
    if ((screen_name.value.length > 0) && (topic_title.value.length > 0) && (topic_post.value.length > 0)) {
      localStorage.setItem("screen_name", screen_name.value);
      // Generate post id.
      var date = new Date();
      var post_id = String_To_Hex(topic_title.value + date.getTime());
      Load_File("Board/Thread_" + thread_id + ".txt", function(data) {
        var posts = Split(data);
        posts.push(topic_title.value + ":" + screen_name.value + ":" + post_id);
        Save_File("Board/Thread_" + thread_id + ".txt", posts.join("\n"), function(message) {
          Save_File("Board/Post_" + post_id + ".txt", topic_post.value, function(message) {
            on_post();
          }, function(error) {
            on_post();
          });
        }, function(error) {
          on_post();
        });
      }, function(error) {
        on_post();
      });
    }
    else {
      if (screen_name.value.length == 0) {
        screen_name.focus();
      }
      if (topic_title.value.length == 0) {
        topic_title.focus();
      }
      if (topic_post.value.length == 0) {
        topic_post.focus();
      }
    }
  }
  
  /**
   * Updates a post. Validation is performed too.
   * @param post_id The ID of the post to edit.
   * @param screen_name A screen name of your choosing to identify yourself.
   * @param topic_post The body of the post.
   * @param on_post Called when post is complete.
   */
  Post_Edit(post_id, screen_name, topic_post, on_post) {
    if ((screen_name.value.length > 0) && (topic_post.value.length > 0)) {
      localStorage.setItem("screen_name", screen_name.value);
      Save_File("Board/Post_" + post_id + ".txt", topic_post.value, function(message) {
        on_post();
      }, function(error) {
        on_post();
      });
    }
    else {
      if (screen_name.value.length == 0) {
        screen_name.focus();
      }
      if (topic_post.value.length == 0) {
        topic_post.focus();
      }
    }
  }

}

/**
 * Creates a chat. This consists of a chat display pane 
 * and a write box. Again, like the message board you must
 * input the editor code to write to it.
 */
class cChat extends cComponent {

  constructor(entity, settings, container) {
    super(entity, settings, container);
    this.timer = null;
    this.queried_files = [ "refresh" ];
    this.Create();
  }
  
  Create() {
    var chat_outer = this.Create_Element({
      id: this.entity.id,
      type: "div",
      css: {
        "position": "absolute",
        "left": this.entity.x + "px",
        "top": this.entity.y + "px",
        "width": this.entity.width + "px",
        "height": this.entity.height + "px"
      },
      subs: [
        {
          id: this.entity.id + "_message_box",
          type: "div",
          css: {
            "position": "absolute",
            "left": "0",
            "top": "0",
            "width": "calc(100% - 10px)",
            "height": "calc(100% - 104px - 10px)",
            "padding": "5px",
            "overflow": "scroll",
            "background-color": "#FDFEFE",
            "font": this.settings["font"] || "Regular, sans-serif"
          }
        },
        {
          id: this.entity.id + "_screen_name_area",
          type: "div",
          css: {
            "position": "absolute",
            "left": "0",
            "top": "calc(100% - 104px)",
            "width": "100%",
            "height": "24px",
          },
          subs: [
            this.Make_Form(this.entity.id + "_screen_name_form", [
              this.Make_Field(this.entity.id + "_screen_name", {
                "label": "Screen Name",
                "height": 24
              })
            ])
          ]
        },
        {
          id: this.entity.id + "_message_area",
          type: "div",
          css: {
            "position": "absolute",
            "left": "0",
            "top": "calc(100% - 104px + 24px)",
            "width": "100%",
            "height": "56px",
          },
          subs: [
            this.Make_Form(this.entity.id + "_message_form", [
              this.Make_Edit(this.entity.id + "_message", {
                "label": "Type in your message here."
              })
            ])
          ]
        },
        {
          id: this.entity.id + "_post_area",
          type: "div",
          css: {
            "position": "absolute",
            "left": "0",
            "top": "calc(100% - 104px + 24px + 56px)",
            "width": "100%",
            "height": "24px"
          },
          subs: [
            this.Make_Button(this.entity.id + "_post", {
              "label": "Post",
              "top": 0,
              "right": 0,
              "fg-color": "white",
              "bg-color": "lightblue",
              "width": 80,
              "height": 24
            }),
            this.Make_Button(this.entity.id + "_clear", {
              "label": "Clear",
              "top": 0,
              "left": 0,
              "fg-color": "white",
              "bg-color": "lightgreen",
              "width": 80,
              "height": 24
            }),
            this.Make_Button(this.entity.id + "_manual", {
              "label": "Manual",
              "top": 0,
              "left": 84,
              "fg-color": "white",
              "bg-color": "orange",
              "width": 80,
              "height": 24
            })
          ]
        }
      ]
    }, this.container);
    var component = this;
    var message_box = this.elements[this.entity.id + "_message"];
    var screen_name = this.elements[this.entity.id + "_screen_name"];
    screen_name.addEventListener("focus", function(event) {
      screen_name.select();
    }, false);
    this.elements[this.entity.id + "_post"].addEventListener("click", function(event) {
      clearInterval(component.timer);
      component.Post_Message(message_box, screen_name, function(message) {
        console.log(message);
        component.Display_Chats();
        message_box.value = "";
        // Save the screen name.
        localStorage.setItem("screen_name", screen_name.value);
        component.timer = setInterval(function() {
          component.Display_Chats();
        }, 5000);
      }, function(error) {
        console.log(error);
      });
    }, false);
    this.elements[this.entity.id + "_clear"].addEventListener("click", function(event) {
      message_box.value = "";
    }, false);
    this.elements[this.entity.id + "_manual"].addEventListener("click", function(event) {
      open("Wiki_Manual.html", component.entity.id + "_manual", "width=320,height=320,location=off,menubar=off,status=off,toolbar=off,resizable=off");
    }, false);
    // Set up chat display.
    this.Display_Chats();
    this.timer = setInterval(function() {
      component.Display_Chats();
    }, 5000);
    // Load screen name value.
    if (localStorage.getItem("screen_name") != null) {
      screen_name.value = localStorage.getItem("screen_name");
    }
  }
  
  /**
   * Pauses the execution of the timer.
   */
  Pause() {
    clearInterval(this.timer);
    // this.timer = null;
  }
  
  /**
   * Resumes execution of the timer.
   */
  Resume() {
    var component = this;
    this.timer = setInterval(function() {
      component.Display_Chats();
    }, 5000);
  }
  
  /**
   * Posts a message to the chat.
   * @param message The message object to post to.
   * @param screen_name The screen name object identifying the user.
   * @param on_post Called if the message was posted. The success message is passed in.
   * @param on_error Called if the message was not posted. The error message is passed in.
   */
  Post_Message(message, screen_name, on_post, on_error) {
    if ((message.value.length > 0) && (screen_name.value.length > 0)) {
      var date = new Date();
      var time_stamp = date.getTime();
      var post_id = "Chat_" + time_stamp;
      var body = "@" + screen_name.value + "@" + message.value;
      Save_File("Chat/" + post_id + ".txt", body, on_post, on_error);
    }
  }
  
  /**
   * Displays all entered chats that are recent.
   */
  Display_Chats() {
    var component = this;
    Query_Files("@Chat_", "Chat", function(files) {
      // Scrub files.
      var file_count = files.length;
      var scrubbed_files = [];
      for (var file_index = 0; file_index < file_count; file_index++) {
        var file = files[file_index];
        if ((file != "Chat_Screen.txt") && (file != "Chat_Screen_Mobile.txt")) {
          scrubbed_files.push(file);
        }
      }
      scrubbed_files.sort(function(a, b) {
        b = parseInt(b.replace(/^Chat_/, "").replace(/\.txt$/, ""));
        a = parseInt(a.replace(/^Chat_/, "").replace(/\.txt$/, ""));
        return b - a;
      });
      scrubbed_files.reverse();
      files = scrubbed_files.slice(0, 50);
      if (component.queried_files.length != files.length) {
        component.queried_files = files.slice(0);
        component.Remove_Elements(component.elements[component.entity.id + "_message_box"]);
        component.Display_Chat(files, 0, function() {
          setTimeout(function() {
            component.elements["chat_message_box"].scrollTop = component.elements["chat_message_box"].scrollHeight;
          }, 500);
        });
      }
    }, function(error) {
      component.elements[component.entity.id + "_message_box"].innerHTML = "Could not load chat messages.";
    });
  }
  
  /**
   * Displays a chat from a file using the index.
   * @param files The files containing the chats.
   * @param index The index of the chat.
   * @param on_display Called when the chat is done displaying.
   */
  Display_Chat(files, index, on_display) {
    if (index < files.length) {
      var file = files[index];
      var component = this;
      Load_File("Chat/" + file, function(data) {
        var panel = component.Create_Element({
          id: component.entity.id + "_panel_" + index,
          type: "div",
          text: data,
          css: {
            "margin-bottom": "16px",
            "border-bottom": "1px dashed gray",
            "padding-bottom": "8px"
          }
        }, component.entity.id + "_message_box");
        component.Display_Chat(files, index + 1, on_display);
      }, function(error) {
        var error_box = component.Create_Element({
          id: component.entity.id + "_error_box_" + index,
          type: "div",
          text: "Could not load chat.",
          css: {
            "color": "red",
            "font-weight": "bold",
            "margin-bottom": "16px",
            "border-bottom": "1px dashed gray",
            "padding-bottom": "8px"
          }
        }, component.entity.id + "_message_box");
        component.Display_Chat(files, index + 1, on_display);
      });
    }
    else {
      on_display();
    }
  }

}

/**
 * The screen component is used to create video games. It connects with a
 * server and starts the game - there is only graphics, sound, and controller
 * input on the client side. The game itself is ran on the server as a headless
 * game.
 */
class cScreen extends cComponent {

  constructor(entity, settings, container) {
    super(entity, settings, container);
    this.width = this.entity.width;
    this.height = this.entity.height;
    this.graphics = {};
    this.sounds = {};
    this.tracks = {};
    this.graphic_names = [];
    this.sound_names = [];
    this.track_names = [];
    this.image_count = 0;
    this.sound_count = 0;
    this.track_count = 0;
    this.sprites = {};
    this.sprite_names = [];
    this.loaded = false;
    this.Create();
  }

  Create() {
    var layout = this.Create_Element({
      id: this.entity.id,
      type: "div",
      css: {
        "position": "absolute",
        "left": String(this.entity.x + 1) + "px",
        "top": String(this.entity.y + 1) + "px",
        "width": String(this.entity.width - 2) + "px",
        "height": String(this.entity.height - 2) + "px"
      },
      subs: [
        {
          id: this.entity.id + "_canvas",
          type: "canvas",
          attrib: {
            width: this.entity.width - 2,
            height: this.entity.height - 2
          },
          css: {
            "position": "absolute",
            "left": "0",
            "top": "0",
            "width": String(this.entity.width - 2) + "px",
            "height": String(this.entity.height - 2) + "px",
            "background-color": this.settings["color"] || "black"
          }
        },
        {
          id: this.entity.id + "_images",
          type: "div",
          css: {
            "position": "absolute",
            "left": "-2000px",
            "top": "0"
          }
        },
        {
          id: this.entity.id + "_sounds",
          type: "div",
          css: {
            "position": "absolute",
            "left": "-2000px",
            "top": "2000px"
          }
        },
        {
          id: this.entity.id + "_tracks",
          type: "div",
          css: {
            "position": "absolute",
            "left": "-2000px",
            "top": "4000px"
          }
        }
      ]
    }, this.container);
  }
  
  /**
   * Loads a graphic from a file.
   * @param name The name of the graphic to load.
   */
  Load_Graphic(name) {
    var graphic = this.Create_Element({
      id: this.entity.id + "_image_" + name,
      type: "img",
      attrib: {
        src: Get_Image(name + ".png", false)
      }
    }, this.elements[this.entity.id + "_images"]);
    this.graphics[name] = graphic; // Store graphic reference.
    this.graphic_names.push(name);
    var component = this;
    graphic.on_load = function() {
      component.image_count++;
    };
  }
  
  /**
   * Loads a sound from a file.
   * @param name The name of the sound to load.
   */
  Load_Sound(name) {
    var sound = this.Create_Element({
      id: this.entity.id + "_sound_" + name,
      type: "audio",
      subs: [
        {
          id: this.entity.id + "_sound_source_" + name,
          type: "source",
          attrib: {
            src: $http + location.host + "/Sounds/" + name + ".mp3",
            type: "audio/mpeg"
          }
        }
      ]
    }, this.elements[this.entity.id + "_sounds"]);
    this.sounds[name] = sound;
    this.sound_names.push(name);
    sound.load(); // Try loading sound.
    if ($browser.name == "firefox") {
      this.sound_count++;
    }
    else {
      sound.addEventListener("canplaythrough", function() {
        this.sound_count++;
      }, false);
    }
  }
  
  /**
   * Loads a track by name.
   * @param name The name of the track to load.
   */
  Load_Track(name) {
    var track = this.Create_Element({
      id: this.entity.id + "_track_" + name,
      type: "audio",
      attrib: {
        loop: "true"
      },
      subs: [
        {
          id: this.entity.id + "_track_source_" + name,
          type: "source",
          attrib: {
            src: $http + location.host + "/Sounds/" + name + ".mp3",
            type: "audio/mpeg"
          }
        }
      ]
    }, this.elements[this.entity.id + "_tracks"]);
    this.tracks[name] = track;
    this.track_names.push(name);
    track.load(); // Try loading sound track.
    if ($browser.name == "firefox") {
      this.track_count++;
    }
    else {
      sound.addEventListener("canplaythrough", function() {
        this.track_count++;
      }, false);
    }
  }
  
  /**
   * Loads a list of graphics from a file.
   * @param file The file to load graphics from.
   */
  Load_Graphics(file) {
    var component = this;
    Load_File("Database/" + file, function(data) {
      var graphics = Split(data);
      var gfx_count = graphics.length;
      for (var gfx_index = 0; gfx_index < gfx_count; gfx_index++) {
        var name = graphics[gfx_index];
        component.Load_Graphic(name);
      }
    });
  }
  
  /**
   * Loads a sprite sheet from a file.
   * @param file The file to load the sprite sheet from.
   */
  Load_Sprite_Sheet(file) {
    var base_name = file.replace(/\.\w+$/, "");
    var component = this;
    Load_File(file, function(data) {
      this.Load_Graphic(base_name + ".png");
      var sprites = Split(data);
      var sprite_count = sprites.length;
      for (var sprite_index = 0; sprite_index < sprite_count; sprite_index++) {
        var sprite = sprites[sprite_index].split(/,/);
        if (sprite.length == 5) {
          var name = sprite[0];
          var x = parseInt(sprite[1]); 
          var y = parseInt(sprite[2]);
          var width = parseInt(sprite[3]);
          var height = parseInt(sprite[4]);
          component.sprites[name] = {
            x: x,
            y: y,
            width: width,
            height: height
          };
          component.sprite_names.push(name);
        }
      }
    });
  }
  
  /**
   * Loads a list of sounds from a file.
   * @param file The file to load sounds from.
   */
  Load_Sounds(file) {
    var component = this;
    Load_File("Database/" + file, function(data) {
      var sounds = Split(data);
      var sound_count = graphics.length;
      for (var sound_index = 0; sound_index < sound_count; sound_index++) {
        var name = sounds[sound_index];
        component.Load_Sound(name);
      }
    });
  }
  
  /**
   * Loads a list of sound tracks from a file.
   * @param file The file to load sound tracks from.
   */
  Load_Tracks(file) {
    var component = this;
    Load_File("Database/" + file, function(data) {
      var tracks = Split(data);
      var track_count = tracks.length;
      for (var track_index = 0; track_index < track_count; track_index++) {
        var name = tracks[track_index];
        component.Load_Track(name);
      }
    });
  }
  
  /**
   * Checks if resources are loaded or not.
   * @return True if all resources are loaded, false otherwise.
   */
  Are_Resources_Loaded() {
    return ((this.image_count == this.graphic_names.length) && (this.sound_count == this.sound_names.length) && (this.track_count == this.track_names.length));
  }
  
  /**
   * Draws a graphic to the screen.
   * @param name The name of the graphic to draw.
   * @param x The x coordinate of the graphic.
   * @param y The y coordinate of the graphic.
   * @param scale The scale of the graphic.
   * @param angle The angle to rotate the graphic.
   * @param flip_x True if flipped horizontally, false otherwise.
   * @param flip_y True if flipped vertically, false otherwise.
   */
  Draw_Graphic(name, x, y, scale, angle, flip_x, flip_y) {
    if (this.graphics[name] != undefined) {
      var graphic = this.graphics[name];
      var canvas = this.elements[this.entity.id + "_canvas"];
      if (flip_x || flip_y || (angle != 0) || (scale > 1)) {
        var origin_x = x;
        var origin_y = y;
        var image_x = 0;
        var image_y = 0;
        var scale_x = 1 * scale;
        var scale_y = 1 * scale;
        var width = graphic.width;
        var height = graphic.height;
        if (flip_x) {
          image_x = -width * scale;
          scale_x = -1 * scale;
          angle *= -1;
        }
        if (flip_y) {
          image_y = -height * scale;
          scale_y = -1 * scale;
        }
        if (angle != 0) {
          origin_x += Math.floor(width / 2);
          origin_y += Math.floor(height / 2);
          image_x = -Math.floor(width / 2);
          image_y = -Math.floor(height / 2);
        }
        canvas.save();
        canvas.translate(origin_x, origin_y);
        canvas.scale(scale_x, scale_y);
        canvas.rotate(angle * (Math.PI / 180));
        canvas.drawImage(entity, image_x, image_y);
        canvas.restore();
      }
      else {
        canvas.drawImage(entity, x, y);
      }
    }
  }
  
  /**
   * Draws a sprite to the screen.
   * @param name The name of the sprite to draw.
   * @param x The x coordinate of the sprite.
   * @param y The y coordinate of the sprite.
   * @param scale The scale of the sprite.
   * @param angle The angle of the sprite.
   * @param flip_x True to flip horizonally, false not to flip.
   * @param flip_y True to flip vertically, false not to flip.
   */
  Draw_Sprite(name, x, y, scale, angle, flip_x, flip_y) {
    if (this.sprites[name] != undefined) {
      var sprite = this.sprites[name];
      var canvas = this.elements[this.entity.id + "_canvas"];
      if (flip_x || flip_y || (angle != 0) || (scale > 1)) {
        var origin_x = x;
        var origin_y = y;
        var image_x = 0;
        var image_y = 0;
        var scale_x = 1 * scale;
        var scale_y = 1 * scale;
        var width = sprite.width;
        var height = sprite.height;
        if (flip_x) {
          image_x = -width * scale;
          scale_x = -1 * scale;
          angle *= -1;
        }
        if (flip_y) {
          image_y = -height * scale;
          scale_y = -1 * scale;
        }
        if (angle != 0) {
          origin_x += Math.floor(width / 2);
          origin_y += Math.floor(height / 2);
          image_x = -Math.floor(width / 2);
          image_y = -Math.floor(height / 2);
        }
        canvas.save();
        canvas.translate(origin_x, origin_y);
        canvas.scale(scale_x, scale_y);
        canvas.rotate(angle * (Math.PI / 180));
        canvas.drawImage(entity, sprite.x, sprite.y, sprite.width, sprite.height, image_x, image_y, sprite.width, sprite.height);
        canvas.restore();
      }
      else {
        canvas.drawImage(entity, sprite.x, sprite.y, sprite.width, sprite.height, x, y, sprite.width, sprite.height);
      }
    }
  }
  
  /**
   * Plays a loaded sound.
   * @param name The name of the sound to play.
   */
  Play_Sound(name) {
    var sound = this.sounds[name];
    if (sound != undefined) {
      if (sound.readState > 0) {
        sound.currentTime = 0;
        var promise = sound.play();
        promise.catch(function(reason) {
          if (sound.readyState > 0) {
            sound.play();
          }
        });
      }
    }
  }
  
  /**
   * Plays a sound track by name, stopping the previous track.
   * @param name The name of the sound track to play.
   */
  Play_Track(name) {
    // Stop any other track that may be playing.
    var tracks = Object.keys(this.tracks);
    var track_count = tracks.length;
    for (var track_index = 0; track_index < track_count; track_index++) {
      var n = tracks[track_index];
      var t = this.tracks[n];
      if (n != name) {
        t.pause();
      }
    }
    var track = this.tracks[name];
    if (track != undefined) {
      if (track.readyState > 0) { // Can the track be played at all?
        track.currentTime = 0;
        var promise = track.play();
        if (promise) {
          promise.catch(function(reason) {
            if (track.readyState > 0) {
              // Try to play track if something went wrong.
              track.play();
            }
          });
        }
      }
    }
  }
  
  /**
   * Stops a track of the given name.
   * @param name The name of the track to stop.
   */
  Stop_Track(name) {
    var track = this.tracks[name];
    if (track != undefined) {
      track.pause();
    }
  }
  
}

/**
 * The uploader allows uploading of files to the server if the editor code is
 * set.
 */
class cUploader extends cComponent {

  constructor(entity, settings, container) {
    super(entity, settings, container);
    this.Create();
  }

  Create() {
    var layout = this.Create_Element({
      id: this.entity.id + "_form",
      type: "form",
      attrib: {
        action: ""
      },
      css: {
        "position": "absolute",
        "left": String(this.entity.x + 1) + "px",
        "top": String(this.entity.y + 1) + "px",
        "width": String(this.entity.width - 2) + "px",
        "height": String(this.entity.height - 2) + "px",
        "margin": "0",
        "padding": "0"
      },
      subs: [
        {
          id: this.entity.id,
          type: "input",
          attrib: {
            type: "file",
          },
          css: {
            "visibility": "hidden",
            "width": "100%"
          }
        },
        this.Make_Button(this.entity.id + "_upload", {
          "left": 0,
          "top": 0,
          "width": this.entity.width - 2,
          "height": this.entity.height - 2,
          "label": "Upload",
          "bg-color": "lightgreen"
        })
      ]
    }, this.container);
    // Handle uploads.
    var component = this;
    this.elements[this.entity.id + "_upload"].addEventListener("click", function(event) {
      component.elements[component.entity.id].click(); // Invoke click on file browser.
    }, false);
    this.elements[this.entity.id].addEventListener("change", function(event) {
      var files = component.elements[component.entity.id].files;
      if (files.length > 0) {
        var file = files[0];
        component.Handle_File(file);
        event.target.value = "";
      }
    }, false);
  }

  /**
   * Handles a file upload.
   * @param file The file object.
   */
  Handle_File(file) {
    // Allow image, audio, or text.
    if (file.type.match(/image/) || file.type.match(/zip/) || file.type.match(/text/)) {
      this.Change_Color(this.entity.id + "_upload", "lightblue"); // Show blue for uploading.
      var component = this;
      setTimeout(function() { // We set this because the upload may fail.
        component.Change_Color(component.entity.id + "_upload", "lightgreen");
      }, 10000);
      var reader = new FileReader();
      reader.onload = function(event) {
        var name = file.name;
        var data = (file.type.match(/text/)) ? event.target.result : event.target.result.split(/,/).pop(); // We're getting the Base64 string.
        Save_File("Upload/" + name, data, function(message) {
          console.log(message);
          component.Change_Color(component.entity.id + "_upload", "lightgreen");
        });
      };
      if (file.type.match(/text.*/)) { // Read text files as text only!
        reader.readAsText(file);
      }
      else {
        reader.readAsDataURL(file);
      }
    }
  }

}

/**
 * Creates a poll reader to read results from a poll and to
 * display them. The properties are as follows:
 *
 * - file - The file to read the results from. These are counts per line.
 * - labels - A list of labels for the data. They are separated with semicolons.
 * - title - The title that goes in the title bar.
 */
class cPoll extends cComponent {

  constructor(entity, settings, container) {
    super(entity, settings, container);
    this.Create();
  }
  
  Create() {
    var layout = this.Create_Element({
      id: this.entity.id,
      type: "div",
      css: {
        "position": "absolute",
        "left": String(this.entity.x + 1) + "px",
        "top": String(this.entity.y + 1) + "px",
        "width": String(this.entity.width - 2) + "px",
        "height": String(this.entity.height - 2) + "px"
      },
      subs: [
        {
          id: this.entity.id + "_title",
          type: "div",
          text: this.settings["title"] || "poll",
          css: {
            "width": "calc(100% - 10px)",
            "height": "14px",
            "line-height": "14px",
            "text-align": "center",
            "font-weight": "bold",
            "color": "black",
            "padding": "4px",
            "border": "1px solid black",
            "font-size": "12px",
            "background-color": "silver"
          }
        },
        {
          id: this.entity.id + "_body",
          type: "div",
          css: {
            "width": "calc(100% - 10px)",
            "height": "calc(100% - 34px)",
            "padding": "4px",
            "border": "1px solid black",
            "border-top": "0"
          }
        }
      ]
    }, this.container);
    this.Reload();
  }
  
  /**
   * Reloads the poll results.
   */
  Reload() {
    var component = this;
    Load_File("Database/" + this.settings["file"], function(data) {
      var results = Split(data);
      var labels = component.settings["labels"].split(/;/);
      if (labels.length == results.length) { // They must match!
        var result_count = results.length;
        var total = 0;
        // Find total.
        for (var result_index = 0; result_index < result_count; result_index++) {
          var result = parseInt(results[result_index]);
          total += result;
        }
        // Now find percents.
        component.Remove_Elements(component.elements[component.entity.id + "_body"]);
        for (var result_index = 0; result_index < result_count; result_index++) {
          var result = results[result_index];
          var percent = Math.floor((result / total) * 100);
          var label = labels[result_index];
          // Render the percent.
          var percent_disp = component.Create_Element({
            id: component.entity.id + "_" + label,
            type: "div",
            text: label + "... " + String(percent) + "%",
            css: {
              "width": "100%",
              "height": "16px",
              "line-height": "16px",
              "margin-bottom": "1px"
            }
          }, component.entity.id + "_body");
        }
      }
    });
  }

}
  
/**
 * This is a counter that records new visitors that come to the site.
 * It logs the date as well results can be categorized.
 */
class cCounter extends cComponent {

  constructor(entity, settings, container) {
    super(entity, settings, container);
    this.Create();
    var component = this;
    this.Save_Statistics(function() {
      component.Query_Statistics(function(stats) {
        var record = [
          Format("#Today:# " + stats.today),
          Format("#Month:# " + stats.month),
          Format("#Total:# " + stats.total)
        ];
        component.elements[component.entity.id + "_body"].innerHTML = record.join("<br />");
      });
    });
  }

  Create() {
    var layout = this.Create_Element({
      id: this.entity.id,
      type: "div",
      css: {
        "position": "absolute",
        "left": String(this.entity.x + 1) + "px",
        "top": String(this.entity.y + 1) + "px",
        "width": String(this.entity.width - 2) + "px",
        "height": String(this.entity.height - 2) + "px"
      },
      subs: [
        {
          id: this.entity.id + "_title",
          type: "div",
          text: "Visitor Statistics",
          css: {
            "width": "calc(100% - 10px)",
            "height": "14px",
            "line-height": "14px",
            "text-align": "center",
            "font-weight": "bold",
            "color": "black",
            "padding": "4px",
            "border": "1px solid black",
            "font-size": "12px",
            "background-color": "silver"
          }
        },
        {
          id: this.entity.id + "_body",
          type: "div",
          css: {
            "width": "calc(100% - 10px)",
            "height": "calc(100% - 34px)",
            "padding": "4px",
            "border": "1px solid black",
            "border-top": "0"
          }
        }
      ]
    }, this.container);
  }
  
  /**
   * Grabs the statistics from the server.
   * %
   * {
   *   today,
   *   month,
   *   total
   * }
   * %
   * @param on_stats Called when the stats are ready. Stats are passed into callback.
   */
  Query_Statistics(on_stats) {
    Load_File("Database/Counter.txt", function(data) {
      var records = Split(data);
      var rec_count = records.length;
      var stats = {
        today: 0,
        month: 0,
        total: rec_count
      };
      var date = new Date();
      var year = date.getFullYear();
      var day = date.getDate();
      var month = date.getMonth() + 1;
      for (var rec_index = 0; rec_index < rec_count; rec_index++) {
        var record = records[rec_index];
        if (record.match(/^\d+\-\d+\-\d{4}$/)) {
          var tripplet = record.split(/\-/);
          var rec_month = parseInt(tripplet[0]);
          var rec_day = parseInt(tripplet[1]);
          var rec_year = parseInt(tripplet[2]);
          if ((rec_month == month) && (rec_year == year)) {
            stats.month++;
          }
          if ((rec_day == day) && (rec_month == month) && (rec_year == year)) {
            stats.today++;
          }
        }
      }
      // Callback here.
      on_stats(stats);
    }, function(error) {
      // Callback here.
      on_stats({
        today: 0,
        month: 0,
        total: 0
      });
    });
  }
  
  /**
   * Saves the statistics of the user who visited the page.
   * @param on_save Called when the statistics have been saved or don't need to.
   */
  Save_Statistics(on_save) {
    var recorded = localStorage.getItem("count_recorded");
    if (recorded != "yes") {
      var date = new Date();
      var year = date.getFullYear();
      var day = date.getDate();
      var month = date.getMonth() + 1;
      var record = String(month) + "-" + String(day) + "-" + String(year);
      Append_File("Database/Counter.txt", record + "\n", function(message) {
        localStorage.setItem("count_recorded", "yes");
        // Callback here.
        on_save();
      });
    }
    else { // Already recorded, call handler anyways.
      on_save();
    }
  }

}

/**
 * This is a chart control to display visitor usage.
 */
class cVisitor_Chart extends cComponent {

  constructor(entity, settings, container) {
    super(entity, settings, container);
    this.Create();
  }
  
  Create() {
    var layout = this.Create_Element({
      id: this.entity.id,
      type: "div",
      css: {
        "position": "absolute",
        "left": String(this.entity.x + 1) + "px",
        "top": String(this.entity.y + 1) + "px",
        "width": String(this.entity.width - 2) + "px",
        "height": String(this.entity.height - 2) + "px",
        "overflow": "scroll"
      },
      subs: [
        {
          id: this.entity.id + "_title",
          type: "div",
          text: "Visitors Per Month",
          css: {
            "position": "absolute",
            "left": "0",
            "top": "0",
            "width": "100%",
            "height": "24px",
            "text-align": "center",
            "font-weight": "bold",
            "line-height": "24px",
            "font-size": "20px"
          }
        }
      ]
    }, this.container);
    // Load up the counter.
    this.Load_Counter();
  }
  
  /**
   * Loads the counter into the chart.
   */
  Load_Counter() {
    var component = this;
    Load_File("Database/Counter.txt", function(data) {
      var records = Split(data);
      var rec_count = records.length;
      var months = {};
      var month_labels = [];
      for (var rec_index = 0; rec_index < rec_count; rec_index++) {
        var record = records[rec_index];
        if (record.match(/^\d+\-\d+\-\d{4}$/)) {
          var tripplet = record.split(/\-/);
          var rec_month = parseInt(tripplet[0]);
          var rec_day = parseInt(tripplet[1]);
          var rec_year = parseInt(tripplet[2]);
          var month_label = rec_month + "-" + rec_year;
          if (months[month_label] == undefined) {
            months[month_label] = 1;
            month_labels.push(month_label);
          }
          else {
            months[month_label]++;
          }
        }
      }
      // Render the bars.
      var month_count = month_labels.length;
      for (var month_index = 0; month_index < month_count; month_index++) {
        var month = month_labels[month_index];
        var count = months[month];
        var pair = month.split(/-/);
        var m = pair[0];
        var y = pair[1];
        // Make a drop shadow first.
        var shadow = component.Create_Element({
          id: component.entity.id + "_shadow_" + month_index,
          type: "div",
          css: {
            "position": "absolute",
            "left": (month_index == 0) ? "1px" : String((month_index * 52) + 1) + "px",
            "bottom": "15px",
            "width": "48px",
            "height": String(count) + "px",
            "background-color": "black",
            "text-align": "center"
          }
        }, component.entity.id);
        // Now create the bar.
        var bar = component.Create_Element({
          id: component.entity.id + "_bar_" + month_index,
          type: "div",
          css: {
            "position": "absolute",
            "left": String(month_index * 52) + "px",
            "bottom": "16px",
            "width": "48px",
            "height": String(count) + "px",
            "background-color": "lime",
            "text-align": "center"
          },
          subs: [
            {
              id: component.entity.id + "_label_" + month_index,
              type: "div",
              text: m + "/" + y,
              css: {
                "position": "absolute",
                "bottom": "-16px",
                "left": "0",
                "width": "48px",
                "height": "16px",
                "line-height": "16px",
                "text-align": "center",
                "font-size": "10px",
                "font-weight": "bold"
              }
            },
            {
              id: component.entity.id + "_count_" + month_index,
              type: "div",
              text: String(count),
              css: {
                "position": "absolute",
                "top": "-16px",
                "left": "0",
                "width": "48px",
                "height": "16px",
                "line-height": "16px",
                "text-align": "center",
                "font-size": "10px"
              }
            }
          ]
        }, component.entity.id);
      }
    });
  }
  
}