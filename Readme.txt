@Codeloader@

The main reason this is created is to build a new simple website for Codeloader.
It will showcase all ideas and projects that are being worked on. Playable games
will run on the server but the site will allow for interaction with these game
via a server socket connection.

$Markdown$

Most site content is markdown. The layout is called Markdown. Using the layout
fully functional components can be instantiated. These are implemented in text
and converted into coordinates and dimensions to allow the components to be
size. All are attached to a fixed size container. This is then stretched to fill
the viewing window.

$Source Engine$

The engine used to generate the layout and the site itself follows some basic
coding standards. Everything is global but the global namespace is not
polluted.

Begin global variable names with a $$ sign.
%
var $$grid = null;
%

Constants are all caps with spaces escaped out with an underscore.
%
const CELL_W = 32;
%

Function names are capitalized with the space replaced with an underscore.
%
function Render_Grid() {

}
%

Class names (or components) are just like function names but prepended with the
letter c.
%
class cComponent {

}
%

Parsed global elements from HTML are named with a $$ sign on either side.
%
$$container$$.innerHTML = "404 not found.";
%

Parsed components from the layout are named with a double dollar sign.
%
$$menu.Render()
%

$Components$

All components are subclassed from the base component #cComponent#. This
class takes the form.
%
class cComponent {

  constructor(entity, settings, container) {

  }

  Process_Properties() {

  }

}
%

You need to override the #Process_Properties()# method. In here you process
the settings, i.e. #this.settings# which contains all passed in settings
from the parse.

$Files$

All files should be named with uppercase names just like function names. The extension
is in lower case. An example:
%
My_Component.js
%

Name all files according to what they contain. For example, a module that contains classes
should be called #Components.js#.

There is an exception to this, however. Documentation files are preceeded with a lower
case "c". For example, documentation for #Components.js# would be named #cComponents.js#.

$HTML and CSS$

All class names as well as IDs are lower case like variable names. An example:
%
<div id="my_form">
  <form class="internal">
  </form>
</div>
%
