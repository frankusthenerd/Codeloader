// ============================================================================
// Codeloader Key Generator
// Programmed by Francois Lamini
// ============================================================================

Detect_Browser(function() {
  var is_android = Is_Mobile();
  Map_Element_Ids();
  if (is_android) {
    Init_Grid(360, 640);
  }
  else {  
    Init_Grid(960, 640);
  }
  if (!is_android) {
    Resize_Container($key_gen_screen$);
  }
  $pages = {
    "Key Gen Page": {
      container: $key_gen_screen$,
      layout: "Key_Gen_Screen.txt"
    },
  };
  Load_Page(0, function() {
    // Set up user code.
    Init_User_Code();
    // Load up keys.
    Load_File("Keys.txt", function(data) {
      $$key_box.Set_Value(data);
    });
    $$add_key.On("click", function(component, event) {
      if ($$key_name.Get_Value().length > 0) {
        if ($$key_stamp.Get_Value().length > 0) {
          if (!isNaN($$kac.Get_Value())) {
            var key = String_To_Hex($$key_name.Get_Value() + ":" + $$key_stamp.Get_Value());
            var access = $$kac.Get_Value();
            var keys = $$key_box.Get_Value();
            if (keys.length > 0) {
              keys += "\n";
            }
            keys += String(key + "=" + access);
            $$key_box.Set_Value(keys);
          }
        }
      }
    });
    $$gen_time.On("click", function(component, event) {
      var date = new Date();
      var time_stamp = date.getTime();
      $$key_stamp.Set_Value(time_stamp);
    });
    $$update.On("click", function(component, event) {
      Save_File("Keys.txt", $$key_box.Get_Value());
    });
    $$gen_email.On("click", function(component, event) {
      var key = $$email_key.Get_Value();
      var body = "Welcome to Codeloader.\n\nLogin: https://www.codeloader.dev/Home.html?code=" + key;
      $$email_body.Set_Value(body);
    });
    // Show key gen page.
    Flip_Page("Key Gen Page");
  });
  // Create handlers for window resize and keyboard.
  window.addEventListener("resize", function(event) {
    if (!is_android) {
      Resize_Container($key_gen_screen$);
    }
  }, false);
}, function(error) {
  console.log(error);
});
