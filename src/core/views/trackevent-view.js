/* This Source Code Form is subject to the terms of the MIT license
 * If a copy of the MIT license was not distributed with this file, you can
 * obtain one at http://www.mozillapopcorn.org/butter-license.txt */

define( [ "core/logger", "core/eventmanager", "util/dragndrop" ], function( Logger, EventManagerWrapper, DragNDrop ){
  
  var __guid = 0;

  return function( trackEvent, type, inputOptions ){

    var _id = "TrackEventView" + __guid++,
        _element = document.createElement( "div" ),
        _zoom = 1,
        _duration = 1,
        _type = type,
        _start = inputOptions.start || 0,
        _end = inputOptions.end || _start + 1,
        _parent,
        _handles,
        _typeElement = document.createElement( "div" ),
        _draggable,
        _resizable,
        _this = this;

    EventManagerWrapper( _this );

    _element.appendChild( _typeElement );

    function toggleHandles( state ){
      _handles[ 0 ].style.visibility = state ? "visible" : "hidden";
      _handles[ 1 ].style.visibility = state ? "visible" : "hidden";
    } //toggleHandles

    function resetContainer(){
      _element.style.left = ( _start / _duration * _zoom ) + "px";
      _element.style.width = ( ( _end - _start ) / _duration * _zoom ) + "px";
    } //resetContainer

    this.setToolTip = function( title ){
      _element.title = title;
    };

    this.update = function( options ){
      options = options || {};
      _element.style.top = "0px";
      if ( !isNaN( options.start ) ) {
        _start = options.start;
      }
      if ( !isNaN( options.end ) ) {
        _end = options.end;
      }

      // set the display text of the view.
      var text = Popcorn.manifest[_type].view && Popcorn.manifest[_type].view.text;
      if(text){
        if(text[0]=='='){
          text = inputOptions[text.slice(1)];
        } else if(text[0]=='`'){
          text = (function(options){return eval(text.slice(1));})(inputOptions);
        }
      } else {
        text = _type;
      }
      _typeElement.innerHTML = text;

      resetContainer();
      return {'text':text};
    }; //update

    Object.defineProperties( this, {
      trackEvent: {
        enumerable: true,
        get: function(){
          return trackEvent;
        }
      },
      element: {
        enumerable: true,
        get: function(){ return _element; }
      },
      start: {
        enumerable: true,
        get: function(){ return _start; },
        set: function( val ){
          _start = val;
          resetContainer();
        }
      },
      end: {
        enumerable: true,
        get: function(){ return _end; },
        set: function( val ){
          _end = val;
          resetContainer();
        }
      },
      type: {
        enumerable: true,
        get: function(){ return _type; },
        set: function( val ){
          _type = val;
          _typeElement.innerHTML = _type;
          this.update();
          _element.setAttribute( "data-butter-trackevent-type", _type );
        }
      },
      selected: {
        enumerable: true,
        get: function(){ return _draggable.selected; },
        set: function( val ){
          if( val ){
            select();
          }
          else {
            deselect();
          } //if
        }
      },
      zoom: {
        enumerable: true,
        get: function(){
          return _zoom;
        },
        set: function( val ){
          _zoom = val;
          resetContainer();
        }
      },
      duration: {
        enumerable: true,
        get: function(){
          return _element.getBoundingClientRect().width / _zoom;
        },
        set: function( val ){
          resetContainer();
        }
      },
      id: {
        enumerable: true,
        configurable: false,
        get: function(){
          return _id;
        }
      },
      parent: {
        enumerabled: true,
        get: function(){
          return _parent;
        },
        set: function( val ){
          _parent = val;

          if( _draggable ){
            _draggable.destroy();
            _draggable = null;
          }

          if( _resizable ){
            toggleHandles( false );
            _resizable.destroy();
            _resizable = null;
            _handles = null;
          }

          if( _parent ){

            if( _parent.element && _parent.element.parentNode && _parent.element.parentNode.parentNode ){

              _draggable = DragNDrop.draggable( _element, {
                containment: _parent.element.parentNode,
                scroll: _parent.element.parentNode.parentNode,
                start: function(){
                  _this.dispatch( "trackeventdragstarted" );
                },
                stop: function(){
                  _this.dispatch( "trackeventdragstopped" );
                  movedCallback();
                },
                revert: true
              });

              if(typeof Popcorn.manifest[trackEvent.type].options.end != 'undefined') {
                _resizable = DragNDrop.resizable( _element, {
                  containment: _parent.element.parentNode,
                  scroll: _parent.element.parentNode.parentNode,
                  stop: resizedCallback
                });
              }
              _element.setAttribute( "data-butter-draggable-type", "trackevent" );
              _element.setAttribute( "data-butter-trackevent-id", trackEvent.id );

              if( !_handles ){
                _handles = _element.querySelectorAll( ".handle" );
                if( _handles && _handles.length === 2 ){
                  _element.addEventListener( "mouseover", function( e ){
                    toggleHandles( true );
                  }, false );
                  _element.addEventListener( "mouseout", function( e ){
                    toggleHandles( false );
                  }, false );
                  toggleHandles( false );
                }
              }

            }

            resetContainer();
          } //if
        } //set
      }
    });

    function movedCallback() {
      _element.style.top = "0px";
      var rect = _element.getClientRects()[ 0 ];
      _start = _element.offsetLeft / _zoom;
      _end = _start + rect.width / _zoom;
      var _change = butter.currentTime - _start;
      if ( Math.abs(_change * _zoom) < 15) {
        _start = butter.currentTime;
        _end += _change;
      }
      _this.dispatch( "trackeventviewupdated" );
    } //movedCallback

    function resizedCallback() {
      _element.style.top = "0px";
      var rect = _element.getClientRects()[ 0 ];
      _start = _element.offsetLeft / _zoom;
      _end = _start + rect.width / _zoom;
      var _change_start = butter.currentTime - _start;
      var _change_end = butter.currentTime - _end;
      if ( Math.abs(_change_start * _zoom) < 15 || Math.abs(_change_end  * _zoom) < 15) {
        if ( Math.abs(_change_start) < Math.abs(_change_end) ) {
          _start = butter.currentTime;
        } else {
          _end = butter.currentTime;
        }
      }
      _this.dispatch( "trackeventviewupdated" );
    } //resizedCallback

    _element.className = "butter-track-event";
    _this.type = _type;

    _element.id = _id;
    _this.update( inputOptions );

    _element.addEventListener( "mousedown", function ( e ) {
      _this.dispatch( "trackeventmousedown", { originalEvent: e, trackEvent: trackEvent } );
    }, true);
    _element.addEventListener( "mouseup", function ( e ) {
      _this.dispatch( "trackeventmouseup", { originalEvent: e, trackEvent: trackEvent } );
    }, false);
    _element.addEventListener( "mouseover", function ( e ) {
      _this.dispatch( "trackeventmouseover", { originalEvent: e, trackEvent: trackEvent } );
    }, false );
    _element.addEventListener( "mouseout", function ( e ) {
      _this.dispatch( "trackeventmouseout", { originalEvent: e, trackEvent: trackEvent } );
    }, false );

    _element.addEventListener( "dblclick", function ( e ) {
      _this.dispatch( "trackeventdoubleclicked", { originalEvent: e, trackEvent: trackEvent } );
    }, false);

    function select( e ){
      _draggable.selected = true;
      _element.setAttribute( "selected", true );
    } //select

    function deselect( e ) {
      _draggable.selected = false;
      _element.removeAttribute( "selected" );
    } //deselect

  };

});
