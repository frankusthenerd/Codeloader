// ============================================================================
// Codeloader UI Debugger Tool
// Programmed by Francois Lamini
// ============================================================================

window.addEventListener("load", function() {
  // First map element IDs.
  Map_Element_Ids();
  $clear$.addEventListener("click", function(event) {
    $markdown_editor$.value = "";
  }, false);
  $markdown_editor$.addEventListener("keyup", function(event) {
    var key = event.code;
    if (!$timer) {
      $timer = setTimeout(function() {
        Parse_Markdown($markdown_editor$.value, $markdown_output$);
        $timer = null;
      }, 500);
    }
  }, false);
  $markdown_editor$.addEventListener("blur", function(event) {
    var code = $markdown_editor$.value;
    localStorage.setItem("debugger_code", code);
  }, false);
  // Initialize layout.
  Init_Grid(1200, 640);
  // Load debugger code.
  if (localStorage.getItem("debugger_code")) {
    $markdown_editor$.value = localStorage.getItem("debugger_code");
  }
  Parse_Markdown($markdown_editor$.value, $markdown_output$);
}, false);