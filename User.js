// ============================================================================
// Coderloader User Interface Code
// Programmed by Francois Lamini
// ============================================================================

var files = [];
var current_folder = "";
var displayed_files = {};
var routine_map = {};
var catalog = {};
var bump_map_set = {};
var animation_set = {};
var animation_timer = null;
var tasks = {};
var sel_task = -1;
var task_names = [];
var icons = {
  "cpp": "Cpp.png",
  "hpp": "Cpp.png",
  "h": "Cpp.png",
  "script": "C_Lesh.png",
  "js": "JavaScript.png",
  "clsh": "C_Lesh.png",
  "py": "Python.png",
  "wav": "Sound.png",
  "mp3": "Sound.png",
  "png": "Paint.png",
  "xcf": "Paint.png",
  "jpg": "Paint.png",
  "ico": "Paint.png",
  "raw": "Paint.png",
  "ttf": "Font.png",
  "exe": "Application.png",
  "bin": "Application.png"
};
Detect_Browser(function() {
  var is_android = Is_Mobile();
  // Add pages here.
  $pages = {
    "Home Page": {
      container: "home_screen",
      pause: Home_Page_Pause,
      resume: Home_Page_Resume,
      layout: "Home_Screen.txt",
      mobile: "Home_Screen_Mobile.txt"
    },
    "Articles": {
      container: "articles_screen",
      layout: "Articles_Screen.txt",
      mobile: "Articles_Screen_Mobile.txt"
    },
    "Code Bank": {
      container: "code_screen",
      layout: "Code_Screen.txt"
    },
    "Stories": {
      container: "stories_screen",
      layout: "Stories_Screen.txt",
      mobile: "Stories_Screen_Mobile.txt"
    },
    "API Docs": {
      container: "api_screen",
      layout: "API_Screen.txt"
    },
    "Object Catalog": {
      container: "catalog_screen",
      layout: "Catalog_Screen.txt"
    },
    "Bump Map Editor": {
      container: "bmap_editor_screen",
      layout: "Bump_Map_Screen.txt"
    },
    "Animation Editor": {
      container: "animation_screen",
      layout: "Animation_Screen.txt"
    },
    "Sound Editor": {
      container: "sound_screen",
      layout: "Sound_Screen.txt"
    },
    "Task Tracker": {
      container: "task_tracker_screen",
      layout: "Task_Tracker_Screen.txt"
    }
  };
  Create_Page_Containers();
  Map_Element_Ids();
  Remap_Page_Ids();
  if (is_android) {
    Init_Grid(360, 640);
  }
  else {
    Init_Grid(960, 640);
  }
  if (!is_android) {
    Resize_Page_Containers();
  }
  setTimeout(function() { // Set a delay.
    Load_Page(0, function() {
      // Add code here.
      $$st_next.On("click", function(component, event) {
        $$stories_reader.Go_To_Page(1);
      });
      $$st_back.On("click", function(component, event) {
        $$stories_reader.Go_To_Page(-1);
      });
      $$set_art_wiki.On("click", function(component, event) {
        var value = $$art_wiki_name.Get_Value();
        if (value.length > 0) {
          $$articles_wiki.Set_File(value + ".txt");
        }
      });
      $$art_menu.On("click", function(component, event) {
        var item = component.sel_text;
        if (item.length > 0) {
          var name = item.replace(/(\s|\-|')/g, "_");
          var file = name + ".txt";
          $$articles_wiki.Load(file);
          $$art_wiki_name.Set_Value(name);
        }
      });
      $$stories_menu.On("click", function(component, event) {
        var item = component.sel_text;
        if (item.length > 0) {
          var name = item.replace(/(\s|\-|')/g, "_");
          $$stories_reader.Set_Name(name);
        }
      });
      if (!Is_Mobile()) {
        $$projects.On("click", function(component, event) {
          var item = component.sel_text;
          if (item.length > 0) {
            files = [];
            current_folder = "";
            $$code_editor.Toggle_Loading_Sign(true);
            Load_Cabinet(item, item, function(cab_files) {
              $$code_editor.Toggle_Loading_Sign(false);
              files = cab_files;
              Render_Files();
            });
          }
        });
        $$files.On("click", function(component, event) {
          var item = component.sel_text;
          if (item.length > 0) {
            var index = displayed_files[item];
            var name = item;
            if (name == "Up") { // Up arrow.
              if (current_folder.length > 0) {
                var parts = current_folder.split(/\//);
                if (parts.length == 1) {
                  current_folder = "";
                }
                else {
                  parts.pop();
                  current_folder = parts.join("/");
                }
                Render_Files();
              }
            }
            else if (name.match(/^\w+\.\w+$/)) { // File
              var file = files[index];
              if (file.lines.length > 0) { // Text file.
                $$code_editor.Load(file);
                // Update code map.
                routine_map = $$code_editor.Code_Map(file);
                var items = [];
                var routines = Object.keys(routine_map);
                var routine_count = routines.length;
                for (var routine_index = 0; routine_index < routine_count; routine_index++) {
                  var routine = routines[routine_index];
                  items.push(routine + ":");
                }
                $$code.Load_Menu(items, $$code.elements[$$code.entity.id]);
              }
            }
            else { // Folder
              var folder = files[index];
              current_folder = folder.name;
              Render_Files();
            }
          }
        });
        $$code.On("click", function(component, event) {
          var item = component.sel_text;
          if (item.length > 0) {
            var line_no = routine_map[item];
            $$code_editor.Go_To_Line(line_no);
          }
        });
        $$api_menu.On("click", function(component, event) {
          var project = component.sel_text;
          if (project.length > 0) {
            sel_project = project;
            $$api_doc.Load("API_Docs/" + project + "/Files");
          }
        });
        $$add_catalog.On("click", function(component, event) {
          if ($$catalog_name.Get_Value().length > 0) {
            $$catalog_menu.Add_Item($$catalog_name.Get_Value() + ":");
            $$catalog_menu.Save("Catalogs");
            $$catalog_name.Set_Value("");
          }
        });
        $$save_catalog.On("click", function(component, event) {
          if ($$catalog_name.Get_Value().length > 0) {
            Save_Catalog($$catalog_name.Get_Value());
          }
        });
        $$catalog_menu.On("click", function(component, event) {
          $$catalog_name.Set_Value(component.sel_text);
          Load_Catalog(component.sel_text);
        });
        $$add_cat_obj.On("click", function(component, event) {
          try {
            if ($$cat_obj_name.Get_Value().length > 0) {
              $$cat_objects.Add_Item($$cat_obj_name.Get_Value() + ":");
              var name = $$cat_obj_name.Get_Value();
              Check_Condition((catalog[name] == undefined), "Object " + name + " already exists.");
              if ($$cat_obj_parent.Get_Value().length > 0) {
                var parent = $$cat_obj_parent.Get_Value();
                if (catalog[parent] != undefined) {
                  catalog[name] = {
                    "parent": parent // Add parent property.
                  };
                  for (var property in catalog[parent]) {
                    if (property != "parent") { // Don't include parent property if it exists.
                      if (property.match(/^\*/)) { // Do not star property again.
                        catalog[name][property] = catalog[parent][property];
                      }
                      else {
                        catalog[name]["*" + property] = catalog[parent][property]; // Mark properties from parent.
                      }
                    }
                  }
                }
                else {
                  catalog[name] = {};
                }
              }
              else {
                catalog[name] = {};
              }
            }
          }
          catch (error) {
            alert(error);
          }
        });
        $$del_cat_obj.On("click", function(component, event) {
          if ($$cat_obj_name.Get_Value().length > 0) {
            var name = $$cat_obj_name.Get_Value();
            if (catalog[name] != undefined) {
              delete catalog[name];
              $$cat_objects.Remove_Item($$cat_objects.Get_Selected_Index());
              $$catalog_inspector.Clear();
            }
          }
        });
        $$cat_objects.On("click", function(component, event) {
          var name = component.sel_text;
          if (catalog[name]) {
            Save_Object_To_Grid(catalog[name]);
            $$cat_obj_name.Set_Value(name);
            $$cat_obj_parent.Set_Value("");
          }
        });
        $$update_cat_object.On("click", function(component, event) {
          if ($$cat_obj_name.Get_Value().length > 0) {
            var name = $$cat_obj_name.Get_Value();
            if (!catalog[name]) {
              catalog[name] = {};
            }
            Load_Object_From_Grid(catalog[name]);
          }
        });
        $$rescan_parent_obj.On("click", function(component, event) {
          if ($$cat_obj_name.Get_Value().length > 0) {
            var name = $$cat_obj_name.Get_Value();
            Rescan_Parent_Object(catalog[name]);
            Save_Object_To_Grid(catalog[name]);
          }
        });
        $$bmap_set_menu.On("click", function(component, event) {
          $$bmap_set_name.Set_Value(component.sel_text);
          Load_Bump_Map_Set(component.sel_text);
        });
        $$add_bmap_set.On("click", function(component, event) {
          var name = $$bmap_set_name.Get_Value();
          if (name.length > 0) {
            $$bmap_set_menu.Add_Item(name + ":");
            $$bmap_set_menu.Save("Bump_Maps");
            $$bmap_set_name.Set_Value("");
          }
        });
        $$save_bmap_set.On("click", function(component, event) {
          Save_Bump_Map_Set($$bmap_set_name.Get_Value());
        });
        $$bmap_sprites.On("click", function(component, event) {
          $$bmap_spr_name.Set_Value(component.sel_text);
          // Load the bump map names.
          var sprite = $$bmap_spr_name.Get_Value();
          if (bump_map_set[sprite]) {
            $$bump_maps.Clear();
            for (var bump_map_name in bump_map_set[sprite]) {
              $$bump_maps.Add_Item(bump_map_name + ":");
            }
            // Load bump map sprite image.
            $$bump_map_editor.Load_Sprite(sprite);
          }
        });
        $$add_bmap_spr.On("click", function(component, event) {
          try {
            var sprite = $$bmap_spr_name.Get_Value();
            if (sprite.length > 0) {
              Check_Condition((bump_map_set[sprite] == undefined), "Bump map sprite " + sprite + " already exists.");
              bump_map_set[sprite] = {};
              $$bmap_sprites.Add_Item(sprite + ":");
            }
          }
          catch (error) {
            alert(error);
          }
        });
        $$del_bmap_spr.On("click", function(component, event) {
          var sprite = $$bmap_spr_name.Get_Value();
          if (bump_map_set[sprite]) {
            $$bmap_sprites.Remove_Item($$bmap_sprites.Get_Selected_Index());
            delete bump_map_set[sprite];
            $$bump_maps.Clear();
          }
        });
        $$bump_maps.On("click", function(component, event) {
          $$bump_map_name.Set_Value(component.sel_text);
          var sprite = $$bmap_spr_name.Get_Value();
          if (bump_map_set[sprite]) {
            if (bump_map_set[sprite][component.sel_text]) {
              $$bump_map_editor.Load(bump_map_set[sprite][component.sel_text]);
            }
          }
        });
        $$add_bump_map.On("click", function(component, event) {
          try {
            var sprite = $$bmap_spr_name.Get_Value();
            if (bump_map_set[sprite]) {
              var name = $$bump_map_name.Get_Value();
              if (name.length > 0) {
                Check_Condition((bump_map_set[sprite][name] == undefined), "Bump map " + name + " already exists.");
                bump_map_set[sprite][name] = {
                  left: 0,
                  top: 0,
                  right: 15,
                  bottom: 15 // Default size.
                };
                $$bump_maps.Add_Item(name + ":");
              }
            }
          }
          catch (error) {
            alert(error);
          }
        });
        $$del_bump_map.On("click", function(component, event) {
          var sprite = $$bmap_spr_name.Get_Value();
          if (bump_map_set[sprite]) {
            var name = $$bump_map_name.Get_Value();
            if (bump_map_set[sprite][name]) {
              delete bump_map_set[sprite][name];
              $$bump_maps.Remove_Item($$bump_maps.Get_Selected_Index());
            }
          }
        });
        $$save_bump_map.On("click", function(component, event) {
          var sprite = $$bmap_spr_name.Get_Value()
          if (bump_map_set[sprite]) {
            var name = $$bump_map_name.Get_Value();
            if (bump_map_set[sprite][name]) {
              $$bump_map_editor.Save(bump_map_set[sprite][name]);
            }
          }
        });
        $$ani_set_menu.On("click", function(component, event) {
          $$ani_set_name.Set_Value(component.sel_text);
          Load_Animation_Set(component.sel_text);
        });
        $$add_ani_set.On("click", function(component, event) {
          var name = $$ani_set_name.Get_Value();
          if (name.length > 0) {
            $$ani_set_menu.Add_Item(name + ":");
            $$ani_set_menu.Save("Animations");
            $$ani_set_name.Set_Value("");
          }
        });
        $$save_ani_set.On("click", function(component, event) {
          Save_Animation_Set($$ani_set_name.Get_Value());
        });
        $$animations.On("click", function(component, event) {
          $$animation_name.Set_Value(component.sel_text);
          if (animation_set[component.sel_text]) {
            $$ani_sequences.Clear();
            $$ani_seq_images.Clear();
            $$animation.Clear();
            for (var sequence_name in animation_set[component.sel_text]) {
              $$ani_sequences.Add_Item(sequence_name + ":");
            }
          }
        });
        $$add_animation.On("click", function(component, event) {
          try {
            var name = $$animation_name.Get_Value();
            if (name.length > 0) {
              Check_Condition((animation_set[name] == undefined), "Animation " + name + " already exists.");
              animation_set[name] = {};
              $$animations.Add_Item(name + ":");
            }
          }
          catch (error) {
            alert(error);
          }
        });
        $$del_animation.On("click", function(component, event) {
          var name = $$animation_name.Get_Value();
          if (animation_set[name]) {
            delete animation_set[name];
            $$animations.Remove_Item($$animations.Get_Selected_Index());
          }
        });
        $$ani_sequences.On("click", function(component, event) {
          $$ani_sequence_name.Set_Value(component.sel_text);
          var animation_name = $$animation_name.Get_Value();
          if (animation_set[animation_name]) {
            if (animation_set[animation_name][component.sel_text]) {
              $$ani_seq_images.Clear();
              $$animation.Clear();
              $$animation_timeout.Set_Value(animation_set[animation_name][component.sel_text].timeout);
              var image_count = animation_set[animation_name][component.sel_text].images.length;
              for (var image_index = 0; image_index < image_count; image_index++) {
                $$ani_seq_images.Add_Item(animation_set[animation_name][component.sel_text].images[image_index] + ":");
              }
            }
          }
        });
        $$add_ani_sequence.On("click", function(component, event) {
          try {
            var animation_name = $$animation_name.Get_Value();
            if (animation_set[animation_name]) {
              var name = $$ani_sequence_name.Get_Value();
              if (name.length > 0) {
                Check_Condition((animation_set[animation_name][name] == undefined), "Animation sequence " + name + " already exists.");
                $$ani_sequences.Add_Item(name + ":");
                animation_set[animation_name][name] = {
                  timeout: parseInt($$animation_timeout.Get_Value()),
                  images: []
                };
              }
            }
          }
          catch (error) {
            alert(error);
          }
        });
        $$del_ani_sequence.On("click", function(component, event) {
          var animation_name = $$animation_name.Get_Value();
          if (animation_set[animation_name]) {
            var name = $$ani_sequence_name.Get_Value();
            if (animation_set[animation_name][name]) {
              delete animation_set[animation_name][name];
              $$ani_sequences.Remove_Item($$ani_sequences.Get_Selected_Index());
            }
          }
        });
        $$ani_seq_images.On("click", function(component, event) {
          $$ani_seq_image_name.Set_Value(component.sel_text);
          var animation_name = $$animation_name.Get_Value();
          if (animation_set[animation_name]) {
            var ani_seq_name = $$ani_sequence_name.Get_Value();
            if (animation_set[animation_name][ani_seq_name]) {
              $$animation.Load(component.sel_text + ".png");
            }
          }
        });
        $$add_ani_seq_image.On("click", function(component, event) {
          try {
            var animation_name = $$animation_name.Get_Value();
            if (animation_set[animation_name]) {
              var ani_seq_name = $$ani_sequence_name.Get_Value();
              if (animation_set[animation_name][ani_seq_name]) {
                var name = $$ani_seq_image_name.Get_Value();
                if (name.length > 0) {
                  animation_set[animation_name][ani_seq_name].images.push(name);
                  $$ani_seq_images.Add_Item(name + ":");
                }
              }
            }
          }
          catch (error) {
            alert(error);
          }
        });
        $$del_ani_seq_image.On("click", function(component, event) {
          var animation_name = $$animation_name.Get_Value();
          if (animation_set[animation_name]) {
            var ani_seq_name = $$ani_sequence_name.Get_Value();
            if (animation_set[animation_name][ani_seq_name]) {
              var index = $$ani_seq_images.Get_Selected_Index();
              if (index != -1) {
                animation_set[animation_name][ani_seq_name].images.splice(index, 1);
                $$ani_seq_images.Remove_Item(index);
              }
            }
          }
        });
        $$play_anim.On("click", function(component, event) {
          if (!animation_timer) { // Do not play existing animation!
            var animation_name = $$animation_name.Get_Value();
            if (animation_set[animation_name]) {
              var ani_seq_name = $$ani_sequence_name.Get_Value();
              if (animation_set[animation_name][ani_seq_name]) {
                var animation_pointer = 0;
                var image_count = animation_set[animation_name][ani_seq_name].images.length;
                var timeout = parseInt($$animation_timeout.Get_Value());
                animation_set[animation_name][ani_seq_name].timeout = timeout; // Update timeout.
                var frame_pointer = 0;
                animation_timer = setInterval(function() {
                  frame_pointer++;
                  if (frame_pointer > 60) {
                    frame_pointer = 1;
                  }
                  if ((frame_pointer % timeout) == 0) {
                    if (animation_pointer == image_count) {
                      animation_pointer = 0;
                    }
                    $$animation.Load(animation_set[animation_name][ani_seq_name].images[animation_pointer++] + ".png");
                  }
                }, Math.floor(1000 / 60)); // 60 frames per second.
              }
            }
          }
        });
        $$stop_anim.On("click", function(component, event) {
          if (animation_timer) {
            clearInterval(animation_timer);
            animation_timer = null;
          }
        });
        $$add_track.On("click", function(component, event) {
          var name = $$track_name.Get_Value();
          if (name.length > 0) {
            $$track_menu.Add_Item(name + ":");
            $$track_menu.Save("Tracks");
            $$track_name.Set_Value("");
          }
        });
        $$track_menu.On("click", function(component, event) {
          var name = component.sel_text;
          $$track_name.Set_Value(name);
          $$sound_editor.Load_Track(name, function(time_length) {
            $$trk_len.Set_Value(time_length);
            $$track_pos.Set_Value($$sound_editor.pos);
          }, function() {
            $$sound_editor.Clear();
            $$trk_len.Set_Value($$sound_editor.Get_Time_Length());
            $$track_pos.Set_Value($$sound_editor.pos);
          });
        });
        $$save_track.On("click", function(component, event) {
          var name = $$track_name.Get_Value();
          if (name.length > 0) {
            $$sound_editor.Save_Track(name);
          }
        });
        $$sound_palette.On("click", function(component, event) {
          var name = component.sel_text;
          $$sound_name.Set_Value(name);
          $$sound_editor.sel_sound = name;
          $$sound_editor.Play_Sound(name);
        });
        $$add_sound.On("click", function(component, event) {
          var name = $$sound_name.Get_Value();
          if (name.length > 0) {
            $$sound_palette.Add_Item(name + ".png:" + name);
            $$sound_palette.Save("Sounds");
            $$sound_name.Set_Value("");
          }
        });
        $$delete_sound.On("click", function(component, event) {
          var name = $$sound_name.Get_Value();
          if (name.length > 0) {
            var index = $$sound_palette.Get_Selected_Index();
            if (index != -1) {
              $$sound_palette.Remove_Item(index);
              $$sound_palette.Save("Sounds");
              $$sound_palette.sel_sound = "";
            }
          }
        });
        $$update_sounds.On("click", function(component, event) {
          var item_count = $$sound_palette.items.length;
          var sounds = [];
          for (var item_index = 0; item_index < item_count; item_index++) {
            var sound = $$sound_palette.items[item_index].split(/:/).pop();
            sounds.push(sound);
          }
          // Generate sound database.
          Save_File("Sounds/Sounds.txt", sounds.join("\n"), function() {
            $$sound_editor.Load_Sound_Palette("Sounds");
          });
        });
        $$set_trk_l.On("click", function(component, event) {
          var track_length = $$trk_len.Get_Value();
          if (track_length.length > 0) {
            var time_length = parseFloat(track_length);
            $$sound_editor.Resize(time_length);
          }
        });
        $$set_tkpos.On("click", function(component, event) {
          var pos = $$track_pos.Get_Value();
          if (pos.length > 0) {
            $$sound_editor.Set_Position(pos);
          }
        });
        $$play_trck.On("click", function(component, event) {
          $$sound_editor.Play(function(pos) {
            $$track_pos.Set_Value(pos);
          });
        });
        $$stop_trck.On("click", function(component, event) {
          $$sound_editor.Stop();
        });
        $$rwnd_trck.On("click", function(component, event) {
          $$sound_editor.Set_Position(0);
          $$track_pos.Set_Value(0);
        });
        $$clr_trck.On("click", function(component, event) {
          $$sound_editor.Clear();
        });
        $$project_list.On("click", function(component, event) {
          var project = component.sel_text;
          $$project_name.Set_Value(project);
          Load_Project(project);
        });
        $$add_project.On("click", function(component, event) {
          var project = $$project_name.Get_Value();
          if (project.length > 0) {
            $$project_list.Add_Item(project + ":");
            $$project_list.Save("All_Projects");
            $$project_name.Set_Value("");
          }
        });
        $$remove_project.On("click", function(component, event) {
          var index = $$project_list.Get_Selected_Index();
          if (index != -1) {
            $$project_list.Remove_Item(index);
            $$project_list.Save("All_Projects");
            $$project_name.Set_Value("");
            Clear_Project_Info();
          }
        });
        $$export_project.On("click", function(component, event) {
          var project = $$project_name.Get_Value();
          if (project.length > 0) {
            Export_Project(project);
          }
        });
        $$task_list.On("click", function(component, event) {
          var name = component.sel_text;
          try {
            Check_Condition((tasks[name] != undefined), "Task " + name + " does not exist.");
            $$task_name.Set_Value(name);
            var task = tasks[name];
            $$task_description.Set_Value(task.desc);
            // Set status.
            if (task.status == "complete") {
              $$task_complete.Set_Checked(true);
            }
            else {
              $$task_complete.Set_Checked(false);
            }
            if (task.status == "on-hold") {
              $$task_on_hold.Set_Checked(true);
            }
            else {
              $$task_on_hold.Set_Checked(false);
            }
            var hours = Calculate_Task_Time(name);
            $$task_time.Set_Value(hours);
            if (task.time_objs.length > 0) {
              var rate = task.time_objs[task.time_objs.length - 1].rate;
              $$task_rate.Set_Value(rate.toFixed(2));
            }
            else {
              $$task_rate.Set_Value("0");
            }
            sel_task = $$task_list.Get_Selected_Index();
          }
          catch (error) {
            alert(error);
          }
        });
        $$add_task.On("click", function(component, event) {
          var name = $$task_name.Get_Value();
          if (name.length > 0) {
            try {
              Check_Condition((tasks[name] == undefined), "Task " + name + " already exists.");
              tasks[name] = {
                name: name,
                desc: "",
                status: "",
                time_objs: []
              };
              $$task_list.Add_Item(name + ":");
              task_names.push(name);
              var project = $$project_name.Get_Value();
              Save_Project(project);
              Clear_Task_Info();
              sel_task = task_names.length - 1;
            }
            catch (error) {
              alert(error);
            }
          }
        });
        $$remove_task.On("click", function(component, event) {
          var name = $$task_name.Get_Value();
          if (name.length > 0) {
            try {
              Check_Condition((tasks[name] != undefined), "Task " + name + " does not exist.");
              var index = $$task_list.Get_Selected_Index();
              Check_Condition((index != -1), "No task selected.");
              delete tasks[name];
              task_names.splice(index, 1);
              $$task_list.Remove_Item(index);
              var project = $$project_name.Get_Value();
              Save_Project(project);
              Clear_Task_Info();
            }
            catch (error) {
              alert(error);
            }
          }
        });
        $$start_task.On("click", function(component, event) {
          var name = $$task_name.Get_Value();
          if (name.length > 0) {
            try {
              Check_Condition((tasks[name] != undefined), "Task " + name + " does not exist.");
              Check_Condition(($$task_rate.Get_Value().length > 0), "No rate information entered.");
              var task = tasks[name];
              Check_Condition((task.status != "complete"), "Task is already complete!");
              Check_Condition((task.status != "on-hold"), "Task is on hold.");
              // Check to see if task is still open.
              if (task.time_objs.length > 0) {
                var last_time_obj = task.time_objs[task.time_objs.length - 1];
                Check_Condition((last_time_obj.end != -1), "Task is still open. You need to end it!");
              }
              var rate = parseFloat($$task_rate.Get_Value());
              var date = new Date();
              var time_obj = {
                start: date.getTime(),
                end: -1,
                rate: rate
              };
              task.time_objs.push(time_obj);
              // Save the project as well.
              var project = $$project_name.Get_Value();
              Save_Project(project);
            }
            catch (error) {
              alert(error);
            }
          }
        });
        $$stop_task.On("click", function(component, event) {
          var name = $$task_name.Get_Value();
          if (name.length > 0) {
            try {
              Check_Condition((tasks[name] != undefined), "Task " + name + " does not exist.");
              var task = tasks[name];
              Check_Condition((task.time_objs.length > 0), "No task was started.");
              var last_time_obj = task.time_objs[task.time_objs.length - 1];
              Check_Condition((last_time_obj.end == -1), "The task was already ended.");
              var date = new Date();
              last_time_obj.end = date.getTime();
              // Calculate time.
              $$task_time.Set_Value(Calculate_Task_Time(name));
              // Save project.
              var project = $$project_name.Get_Value();
              Save_Project(project);
            }
            catch (error) {
              alert(error);
            }
          }
        });
        $$update_task.On("click", function(component, event) {
          var name = $$task_name.Get_Value();
          if (name.length > 0) {
            try {
              Check_Condition((tasks[name] != undefined), "Task " + name + " does not exist.");
              var task = tasks[name];
              Check_Condition(($$task_description.Get_Value().length > 0), "No description entered for the task.");
              task.desc = $$task_description.Get_Value();
              Check_Condition((sel_task != -1), "No task selected!");
              if (task.time_objs.length > 0) {
                var last_time_obj = task.time_objs[task.time_objs.length - 1];
                Check_Condition((last_time_obj.end != -1), "Cannot update task that is not ended.");
              }
              if ($$task_complete.checked) {
                task.status = "complete";
                $$task_list.Update_Item(name + ":Check.png", sel_task);
              }
              else if ($$task_on_hold.checked) {
                task.status = "on-hold";
                $$task_list.Update_Item(name + ":Cross.png", sel_task);
              }
              else {
                task.status = "";
                $$task_list.Update_Item(name + ":", sel_task);
              }
              // Save project.
              var project = $$project_name.Get_Value();
              Save_Project(project);
            }
            catch (error) {
              alert(error);
            }
          }
        });
      }
      // Initialize navigation handler.
      Init_Navigation_Handler();
      // Load the catalog menu.
      Load_Catalog_Menu();
      // Load the bump map menu.
      Load_Bump_Map_Menu();
      // Load the animation menu.
      Load_Animation_Menu();
      // Loads the sound track menu.
      Load_Track_Menu();
      // Load the sound palette.
      Load_Sound_Palette();
      // Loads the task tracker projects.
      Load_Projects();
      // Show home page.
      Flip_Page("Home Page");
    });
  }, 1500);
  // Create handlers for window resize.
  window.addEventListener("resize", function(event) {
    if (!is_android) {
      Resize_Page_Containers();
    }
  }, false);
  window.addEventListener("keydown", function(event) {
    var key = event.code;
    if (key == "Escape") {
      $user_mode = "editor";
      // Change wallpaper.
      document.body.style.backgroundImage = Get_Image("Dev_Wallpaper.png", true);
    }
  }, false);
}, function(error) {
  $browser_error$.innerHTML = error;
  $browser_error$.style.display = "block";
});

/**
 * This is to stop the marquee.
 */
function Home_Page_Pause() {
  if (!Is_Mobile()) {
    $$news.Pause();
  }
}

function Home_Page_Resume() {
  if (!Is_Mobile()) {
    $$news.Resume();
  }
}

/**
 * Renders the files to the file palette.
 */
function Render_Files() {
  var file_count = files.length;
  var items = [];
  displayed_files = {};
  if (current_folder.length > 0) {
    items.push("Up_Arrow.png:Up");
  }
  for (var file_index = 0; file_index < file_count; file_index++) {
    var file = files[file_index];
    if (current_folder.length > 0) {
      var parts = file.name.split(/\//);
      var name = parts.pop(); // Gives file name.
      var folder = parts.join("/");
      var ext = (name.match(/^\w+\.\w+$/)) ? name.replace(/^\w+\./, "") : "";
      if (folder == current_folder) { // File is in current directory.
        var icon = "Folder.png";
        if (ext.length > 0) {
          var icon = icons[ext];
          if (icon == undefined) {
            icon = "Text.png";
          }
        }
        items.push(icon + ":" + name);
        displayed_files[name] = file_index;
      }
    }
    else { // Set to root.
      if (!file.name.match(/\//)) { // No folder separator.
        var name = file.name;
        var ext = (name.match(/^\w+\.\w+$/)) ? name.replace(/^\w+\./, "") : "";
        var icon = "Folder.png";
        if (ext.length > 0) {
          var icon = icons[ext];
          if (icon == undefined) {
            icon = "Text.png";
          }
        }
        items.push(icon + ":" + name);
        displayed_files[name] = file_index; // Store path info.
      }
    }
  }
  $$files.Load_Tools(items, $$files.elements[$$files.entity.id]);
}

/**
 * Loads an object from the inspector.
 * @param object The object.
 */
function Load_Object_From_Grid(object) {
  Clear_Object(object);
  var data = $$catalog_inspector.Get_Table_Data();
  var rows = Split(data);
  var row_count = rows.length;
  for (var row_index = 0; row_index < row_count; row_index++) {
    var columns = rows[row_index].split(/\t/);
    var name = columns[0];
    var value = columns[1];
    if (name.length > 0) { // Ignore blank names.
      object[name] = value;
    }
  }
}

/**
 * Saves an object to the inspector.
 * @param object The object.
 */
function Save_Object_To_Grid(object) {
  var data = [];
  for (var name in object) {
    var value = object[name];
    data.push(name + "\t" + value);
  }
  $$catalog_inspector.Set_Table_Data(data.join("\n"));
}

/**
 * Loads a catalog given a name.
 * @param name The name of the catalog.
 * @throws An error if the catalog is not formatted correctly.
 */
function Load_Catalog(name) {
  Load_File("Objects/" + name + ".txt", function(data) {
    try {
      var lines = Split(data);
      $$cat_objects.Clear();
      catalog = {};
      while (lines.length > 0) {
        var name = Parse_Line(lines);
        var object = Parse_Object(lines);
        catalog[name] = object;
        $$cat_objects.Add_Item(name + ":");
      }
    }
    catch (error) {
      console.log("Catalog Error: " + error);
    }
  });
}

/**
 * Writes a catalog out to a file.
 * @param name The name of the catalog to write.
 */
function Save_Catalog(name) {
  var data = [];
  for (var sprite_name in catalog) {
    var object = catalog[sprite_name];
    data.push(sprite_name);
    data.push("object");
    for (var property in object) {
      var value = object[property];
      data.push(property + "=" + value);
    }
    data.push("end");
  }
  Save_File("Objects/" + name + ".txt", data.join("\n"), function(message) {
    console.log(message);
  });
}

/**
 * Loads the catalog menu.
 */
function Load_Catalog_Menu() {
  Load_File("Database/Catalogs.txt", function(data) {
    var items = Split(data);
    $$catalog_menu.Load_From_List(items);
  });
}

/**
 * Rescans the parent object and updates the parent properties.
 * @param object The subclass object.
 */
function Rescan_Parent_Object(object) {
  if (object["parent"]) {
    var parent = catalog[object["parent"]];
    if (parent != undefined) {
      for (var property in object) {
        if (property.match(/^\*/)) { // Starred property.
          if (parent[property.substring(1)] == undefined) { // Not in base.
            delete object[property]; // Remove the property.
          }
        }
      }
      for (var property in parent) {
        if (object["*" + property] == undefined) { // Property new to object?
          object["*" + property] = parent[property]; // Add it in!
        }
      }
    }
  }
}

/**
 * Destars a starred object.
 * @param object The object to unstar.
 */
function Destar_Object(object) {
  var new_object = {};
  for (var property in object) {
    if (property.match(/^\*/)) {
      new_object[property.substring(1)] = object[property];
    }
    else {
      new_object[property] = object[property];
    }
  }
  object = new_object;
}

/**
 * Loads a list of bump map sets into the menu.
 */
function Load_Bump_Map_Menu() {
  Load_File("Database/Bump_Maps.txt", function(data) {
    var items = Split(data);
    $$bmap_set_menu.Load_From_List(items);
  });
}

/**
 * Loads a bump map set.
 * @param name The name of the bump map set. 
 */
function Load_Bump_Map_Set(name) {
  Load_File("Bump_Maps/" + name + ".txt", function(data) {
    try {
      var lines = Split(data);
      bump_map_set = {};
      $$bmap_sprites.Clear();
      $$bump_maps.Clear();
      $$bump_map_editor.Clear();
      while (lines.length > 0) {
        var sprite = Parse_Line(lines);
        var bump_map_name = "";
        bump_map_set[sprite] = {};
        $$bmap_sprites.Add_Item(sprite + ":");
        while (bump_map_name != "end") {
          bump_map_name = Parse_Line(lines);
          if (bump_map_name != "end") {
            var bump_map = Parse_Object(lines);
            Check_Condition((bump_map.left != undefined), "Missing left property of bump map.");
            Check_Condition((bump_map.top != undefined), "Missing top property of bump map.");
            Check_Condition((bump_map.right != undefined), "Missing right property of bump map.");
            Check_Condition((bump_map.bottom != undefined), "Missing bottom property of bump map.");
            bump_map_set[sprite][bump_map_name] = bump_map;
          }
        }
      }
    }
    catch (error) {
      console.log("Bump Map Set Error: " + error);
    }
  }, function(error) {
    bump_map_set = {};
    $$bmap_sprites.Clear();
    $$bump_maps.Clear();
    $$bump_map_editor.Clear();
  });
}

/**
 * Saves the bump map set.
 * @param name The name of the bump map set.
 */
function Save_Bump_Map_Set(name) {
  var data = [];
  for (var sprite in bump_map_set) {
    data.push(sprite);
    for (var bump_map_name in bump_map_set[sprite]) {
      data.push(bump_map_name);
      data.push("object");
      for (var property in bump_map_set[sprite][bump_map_name]) {
        var value = bump_map_set[sprite][bump_map_name][property];
        data.push(property + "=" + value);
      }
      data.push("end");
    }
    data.push("end");
  }
  Save_File("Bump_Maps/" + name + ".txt", data.join("\n"), function(message) {
    console.log(message);
  });
}

/**
 * Loads the animation menu.
 */
function Load_Animation_Menu() {
  Load_File("Database/Animations.txt", function(data) {
    var items = Split(data);
    $$ani_set_menu.Load_From_List(items);
  });
}

/**
 * Loads an animation set from a file.
 * @param name The name of the animation set.
 */
function Load_Animation_Set(name) {
  Load_File("Animations/" + name + ".txt", function(data) {
    try {
      $$animations.Clear();
      $$ani_sequences.Clear();
      $$ani_seq_images.Clear();
      animation_set = {};
      var lines = Split(data);
      while (lines.length > 0) {
        var animation_name = Parse_Line(lines);
        animation_set[animation_name] = {};
        $$animations.Add_Item(animation_name + ":");
        var sequence_name = "";
        while (sequence_name != "end") {
          sequence_name = Parse_Line(lines);
          if (sequence_name != "end") {
            var sequence = Parse_Object(lines);
            Check_Condition((sequence.timeout != undefined), "No timeout property in sequence.");
            Check_Condition((sequence.images != undefined), "Images property not defined in sequence.");
            animation_set[animation_name][sequence_name] = {
              timeout: parseInt(sequence.timeout),
              images: sequence.images.split(/,/)
            };
          }
        }
      }
    }
    catch (error) {
      console.log("Animation Set Error: " + error);
    }
  });
}

/**
 * Saves an animation set.
 * @param name The name of the animation set. 
 */
function Save_Animation_Set(name) {
  var data = [];
  for (var animation_name in animation_set) {
    data.push(animation_name);
    for (var sequence_name in animation_set[animation_name]) {
      data.push(sequence_name);
      data.push("object");
      for (var property in animation_set[animation_name][sequence_name]) {
        if (animation_set[animation_name][sequence_name][property] instanceof Array) {
          data.push(property + "=" + animation_set[animation_name][sequence_name][property].join(","));
        }
        else {
          data.push(property + "=" + animation_set[animation_name][sequence_name][property]);
        }
      }
      data.push("end");
    }
    data.push("end");
  }
  Save_File("Animations/" + name + ".txt", data.join("\n"), function(message) {
    console.log(message);
  });
}

/**
 * Loads the sound track menu.
 */
function Load_Track_Menu() {
  Load_File("Database/Tracks.txt", function(data) {
    var items = Split(data);
    $$track_menu.Load_From_List(items);
  });
}

/**
 * Loads the sound palette.
 */
function Load_Sound_Palette() {
  Load_File("Database/Sounds.txt", function(data) {
    var items = Split(data);
    $$sound_palette.Load_From_List(items);
    $$sound_editor.Load_Sound_Palette("Sounds");
  });
}

/**
 * Loads the projects.
 */
function Load_Projects() {
  Load_File("Database/All_Projects.txt", function(data) {
    var projects = Split(data);
    $$project_list.Load_From_List(projects);
  });
}

/**
 * Loads a project by name.
 * @param name The name of the project.
 */
function Load_Project(name) {
  Load_File("Projects/" + name + ".txt", function(data) {
    try {
      var lines = Split(data);
      Clear_Project_Info();
      while (lines.length > 0) {
        var task = {
          name: Parse_Line(lines),
          desc: Parse_Line(lines),
          status: Parse_Line(lines),
          time_objs: []
        };
        var time_obj_count = parseInt(Parse_Line(lines));
        for (var time_obj_index = 0; time_obj_index < time_obj_count; time_obj_index++) {
          var time_obj = Parse_Object(lines);
          Check_Condition((time_obj.start != undefined), "Missing start field of time object.");
          Check_Condition((time_obj.end != undefined), "Missing end field of time object.");
          Check_Condition((time_obj.rate != undefined), "Missing rate field of time object.");
          task.time_objs.push(time_obj);
        }
        tasks[task.name] = task;
        task_names.push(task.name);
        if (task.status == "complete") {
          $$task_list.Add_Item(task.name + ":Check.png");
        }
        else if (task.status == "on-hold") {
          $$task_list.Add_Item(task.name + ":Cross.png");
        }
        else {
          $$task_list.Add_Item(task.name + ":");
        }
      }
    }
    catch (error) {
      console.log(error);
    }
  }, function(error) {
    Clear_Project_Info();
  });
}

/**
 * Saves a project by name.
 * @param name The name of the project.
 */
function Save_Project(name) {
  var data = [];
  var task_count = task_names.length;
  for (var task_index = 0; task_index < task_count; task_index++) {
    var task_name = task_names[task_index];
    var task = tasks[task_name];
    data.push(task.name);
    data.push(task.desc);
    data.push(task.status);
    var time_obj_count = task.time_objs.length;
    data.push(time_obj_count);
    for (var time_obj_index = 0; time_obj_index < time_obj_count; time_obj_index++) {
      var time_obj = task.time_objs[time_obj_index];
      data.push("object");
      for (var property in time_obj) {
        var value = time_obj[property];
        data.push(property + "=" + value);
      }
      data.push("end");
    }
  }
  Save_File("Projects/" + name + ".txt", data.join("\n"), function(message) {
    console.log(message);
  });
}

/**
 * Exports a project to a tab delimited file.
 * @param name The name of the project to export. 
 */
function Export_Project(name) {
  var task_count = task_names.length;
  var data = [ "Task\tDescription\tStatus\tStart Date\tEnd Date\tHours\tCommission" ];
  for (var task_index = 0; task_index < task_count; task_index++) {
    var task_name = task_names[task_index];
    var task = tasks[task_name];
    var columns = [];
    columns.push(task.name);
    columns.push(task.desc);
    columns.push(task.status);
    if (task.time_objs.length == 0) {
      columns.push("Not started.");
      columns.push("Not finished.");
    }
    else if (task.time_objs.length == 1) {
      var time_obj = task.time_objs[0];
      var start_date = new Date(time_obj.start);
      var end_date = (time_obj.end == -1) ? "none" : new Date(time_obj.end);
      columns.push(start_date.toDateString());
      columns.push((end_date == "none") ? "Not finished." : end_date.toDateString());
    }
    else {
      var time_obj_start = task.time_objs[0];
      var time_obj_end = task.time_objs[task.time_objs.length - 1];
      var start_date = new Date(time_obj_start.start);
      var end_date = (time_obj_end.end == -1) ? "none" : new Date(time_obj_end.end);
      columns.push(start_date.toDateString());
      columns.push((end_date == "none") ? "Not finished." : end_date.toDateString());
    }
    // Sum up hours and commission.
    var hours = 0;
    var commission = 0;
    var time_obj_count = task.time_objs.length;
    for (var time_obj_index = 0; time_obj_index < time_obj_count; time_obj_index++) {
      var time_obj = task.time_objs[time_obj_index];
      if (time_obj.end != -1) { // Should be the last time object.
        var time_spent = (time_obj.end - time_obj.start) / (1000 * 60 * 60);
        hours += time_spent;
        commission += (time_obj.rate * time_spent);
      }
    }
    columns.push(hours.toFixed(2)); // Round up or down.
    columns.push("$" + commission.toFixed(2));
    data.push(columns.join("\t"));
  }
  Save_File("Projects/" + name + "_Export.txt", data.join("\n"), function(message) {
    console.log(message);
  });
}

/**
 * Clears out the project information.
 */
function Clear_Project_Info() {
  tasks = {};
  task_names = [];
  $$task_list.Clear();
  Clear_Task_Info();
}

/**
 * Calculates the time that a task took in hours.
 * @param name The name of the task.
 * @return The number of hours taken which is rounded.
 */
function Calculate_Task_Time(name) {
  var task = tasks[name];
  var hours = 0;
  var time_obj_count = task.time_objs.length;
  for (var time_obj_index = 0; time_obj_index < time_obj_count; time_obj_index++) {
    var time_obj = task.time_objs[time_obj_index];
    if (time_obj.end != -1) {
      var time_spent = (time_obj.end - time_obj.start) / (1000 * 60 * 60);
      hours += time_spent;
    }
  }
  return hours.toFixed(2);
}

/**
 * Clears information associated with a task.
 */
function Clear_Task_Info() {
  sel_task = -1;
  $$task_description.Set_Value("");
  $$task_rate.Set_Value("");
  $$task_time.Set_Value("");
  $$task_complete.Set_Checked(false);
  $$task_on_hold.Set_Checked(false);
}