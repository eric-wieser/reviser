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
PageSlice.prototype.toJSON = function() {
  return { from: this.slice.start, to: this.slice.end, page: this.page.pageNumber };
}

PageSlice.sortFunc = function(a, b) {
  return a.startsBefore(b) ? -1 :
         b.startsBefore(a) ?  1 : 0
}

// Tell knockout how to render a pageSlice
ko.bindingHandlers.pageSliceRender = {
  init: function(element, valueAccessor) {
    var slice = ko.unwrap(valueAccessor());
    slice.render(element);
  }
};

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

// deserialization
Section.loadFrom = function(json, pdf) {
  return Promise.all(
    json.slices.map(function(s) {
      return PageSlice.loadFrom(s, pdf)
    })
  ).then(function(slices) {
    return new Section(json.type, slices);
  });
}

PageSlice.loadFrom = function(json, pdf) {
  return pdf.getPage(json.page).then(function(page) {
    return new PageSlice(
      new Slice(json.from, json.to),
      page
    )
  });
}

var loadFromJSON = function(json) {
  return PDFJS.getDocument(json.file).then(function(pdf) {
    return Promise.all(
      json.sections.map(function(sectionJson) {
        return Section.loadFrom(sectionJson, pdf)
      })
    );
  })
}
