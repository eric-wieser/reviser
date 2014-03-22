var Slice = function(a, b) {
  this.a = a;
  this.b = b;
};
Slice.prototype = {
  constructor: Slice,
  get start() {
    return this.a > this.b ? this.b : this.a;
  },
  get end() {
    return this.a > this.b ? this.a : this.b;
  },
  get length() {
    return Math.abs(this.a - this.b);
  }
}

var Section = function(type, slices) {
  this.type = type || 'question';
  this.slices = slices || [];

  ko.track(this);
};

Section.sortFunc = function(a, b) {
  return PageSlice.sortFunc(a.slices[0], b.slices[0]);
}

var PageSlice = function(slice, page) {
  this.slice = slice;
  this.page = page;

  ko.track(this);
}

PageSlice.prototype.render = function(canvas) {
  var fullVP = this.page.getViewport(1);

  var newVP = new PDFJS.PageViewport(
    /* viewBox  */ [
      fullVP.viewBox[0],
      this.slice.start,
      fullVP.viewBox[2],
      this.slice.end,
    ],
    /* scale    */ 1,
    /* rotation */ 0,
    /* offset   */ 0, 0
  )

  var context = canvas.getContext('2d');
  canvas.height = newVP.height;
  canvas.width = newVP.width;

  if(this._lastCanvas && this._lastCanvas.width == canvas.width && this._lastCanvas.height == canvas.height) {
    context.drawImage(this._lastCanvas, 0, 0);
  }
  else {
    this.page.render({canvasContext: context, viewport: newVP});

    this._lastCanvas = canvas;
  }
}

PageSlice.prototype.startsBefore = function(other) {
  if(this.page.pageNumber == other.page.pageNumber)
    return this.slice.start > other.slice.start; // coordinates decrease down the page
  else
    return this.page.pageNumber < other.page.pageNumber;
}

PageSlice.sortFunc = function(a, b) {
  return a.startsBefore(b) ? -1 :
         b.startsBefore(a) ?  1 : 0
}

var Highlight = function(slice) {
  this.slice = slice;
  this.$elem = $('<div>').addClass('highlight');
  this.target = null;

  this.$elem.data('highlight', this);
}
Highlight.prototype = {
  redraw: function() {
    this.$elem.css('top', this.slice.start - 1 + 'px');
    this.$elem.css('height', this.slice.length + 1 + 'px');
  },
  attach: function(target) {
    this.target = target;
    this.$elem.appendTo(target);
    this.redraw();
  },
  detach: function() {
    this.target = null;
    this.$elem.detach();
  },
  updateFromEvent: function(e) {
    this.slice.b = eventRelY(e, this.target);
    this.redraw();
  }
}