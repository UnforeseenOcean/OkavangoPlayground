var carrier; // this is the oscillator we will hear
var modulator; // this oscillator will modulate the amplitude of the carrier
var fft; // we'll visualize the waveform 

var w = $( window ).width();
var h = $( window ).height();

var Member = 'Adjany';

var apiEndPoint = 'http://intotheokavango.org/api/features/';

var days = [];

var focusDay;

var displayFont;

var teamMember;
var hrLabel;
var totalBeats;

var cBPM = 0;
var tBPM = 100;

var totalHeartBeats = 0;

function preload() {

}

function setup() {
  createCanvas(w,h);
  noFill();
  background(30); // alpha

  //Top label

  totalBeats = createSpan('').addClass('title');
  totalBeats.position(25,15);
  totalBeats.style("color", "#BBB");
  totalBeats.style("font-family", "Helvetica");
  totalBeats.style("font-size", "18px");


  teamMember = createSpan('Loading...').addClass('title');
  teamMember.position(25,35);
  teamMember.style("color", "#FFF");
  teamMember.style("font-family", "Helvetica");
  teamMember.style("font-size", "36px");

  //HR label

  hrLabel = createSpan('#').addClass('title');
  hrLabel.position(25,75);
  hrLabel.style("color", "#FFF");
  hrLabel.style("font-family", "Helvetica");
  hrLabel.style("font-size", "36px");

  timeLabel = createSpan('').addClass('title');
  timeLabel.position(25,115);
  timeLabel.style("color", "#BBB");
  timeLabel.style("font-family", "Helvetica");
  timeLabel.style("font-size", "18px");

  //*-------------- DATA
  loadRange("Steve", 68,69);

  //*-------------- SOUND

  //Sound maker
  carrier = new p5.Oscillator(); // connects to master output by default
  carrier.freq(220);
  carrier.amp(0);
  carrier.start();

  //Modulator for the sound
  modulator = new p5.Oscillator('sine');
  modulator.disconnect();  // disconnect the modulator from master output
  modulator.freq(5);
  modulator.amp(1);
  modulator.start();

  // Modulate the carrier's amplitude with the modulator
  // Optionally, we can scale the signal.
  carrier.amp(modulator.scale(-1,1,1,-1));

}

function mousePressed() {
  if (focusDay.buttonOver) {
    focusDay.sorted = !focusDay.sorted;
    focusDay.renderBeats();
  }
}

function setTime(time) {
  var now = moment(time * 1000);
  var d = now.tz('Africa/Windhoek').format('h:mma');     // 8am EDT
  timeLabel.html(d);

}

function loadRange(member, start, end) {
  totalHeartBeats = 0;
  Member = member;
  teamMember.html(member);
  days = [];
  var stack = 0;
  var dh = height / (end - start);
  for (var d = start; d < end; d++) {
    var day = new HRDay(Member, d, 0, stack, width, dh);
    days.push(day);
    day.requestHR(Member, d);
    stack += day.fh;
  }
}

function draw() {
  background(30,30,30); // alpha

  focusDay = days[floor(map(mouseY, 0, height, 0, days.length))];

  for (var i = 0; i < days.length; i++) {
    days[i].render();
  }

  cBPM += (tBPM - cBPM) * 0.1;
  hrLabel.html(round(cBPM) + "b.p.m.");

  var modFreq = cBPM / 60;
  modulator.freq(modFreq);

  var modAmp = 0.2;//map(mouseX, 0, width, 0, 1);
  modulator.amp(modAmp, 0.1); // fade time of 0.1 for smooth fading

}

function HRDay(member, day, x, y, w, h, graphing) {
  this.graphing = graphing;
  this.member = member;
  this.day = day;
  this.startTime;
  this.w = w;
  this.h = h;
  this.fh = h;
  this.pos = {};
  this.pos.x = x;
  this.pos.y = y;
  this.beats = [];
  this.rBeats = [];
  this.cumulativeBeats = [];
  this.canvas = createGraphics(w,this.fh);
  this.canvas.background(0);
  this.canvas.stroke(255);
  this.sorted = false;
  this.loaded = false;
  this.shadeW = w;
  this.tshadeW = w;
  this.buttonOver = false;
  this.dragging = false;
  this.dragX = 0;
  this.boundLeft = 0;
  this.boundRight = 0;
}

HRDay.prototype.render = function() {
  this.shadeW += (this.tshadeW - this.shadeW) * 0.1;
  this.buttonOver = mouseX > this.pos.x + this.w - 30 && mouseX < this.pos.x + this.w - 10 && mouseY > this.pos.y + 10 && mouseY < this.pos.y + 30;

  push();
    translate(this.pos.x, this.pos.y);
    //tint(255, (focusDay == this) ? 255:150);
    image(this.canvas, 0, 0);
    var range = 10;

    //Is this the Day that the mouse is currently over?
    if (focusDay == this) {

      //Drag rectangle
      if (mouseIsPressed && !this.dragging && !this.buttonOver) {
        console.log("Start drag");
        this.dragging = true;
        this.dragX = mouseX;

      } else if (mouseIsPressed && this.dragging) {
        fill(255,50);
        rect(this.dragX, 0, mouseX - this.dragX, this.h);

      } else if (!mouseIsPressed) {
        if (this.dragging) {
          var nbl = floor(map(this.dragX, 0, this.w, this.boundLeft, this.boundRight));
          var nbr = floor(map(mouseX, 0, this.w, this.boundLeft, this.boundRight));
          if (nbr - nbl > 100) {
          this.boundLeft = nbl ;
          this.boundRight = nbr;
          } else {
            this.boundLeft = 0;
            this.boundRight = this.beats.length;
          }
          this.renderBeats();
          this.dragging = false;
          console.log("End drag" + nbl + ":" + nbr);

        }
        
      }

      //Find the HR record that is nearest the mouse
      var ind = floor(map(mouseX, 0, width, this.boundLeft, this.boundRight));
      console.log(ind);

      setTime(this.cumulativeBeats[ind]);

      var tot = 0;
      var c = 0;
      for(var i = max(0,ind - range); i < min(this.rBeats.length, ind + range); i++) {
        tot += this.rBeats[i];
        c ++;
      }
      //Average interval between heart beats (millis per beat)
      var av = tot / c;
      var hr = 60000 / av;

      if (!isNaN(hr)) {
        tBPM = hr;
        
        //setBPM(hr);
      }

      //Sort button 
      push();
      translate(w-30,10)

      noStroke();
      fill(255, this.buttonOver ? 255:100);
      rect(0,0,20,20)
      var stack = !this.sorted ? [6,12,16]:[16,6,10];

      translate(0,18);
      for (var j = 0; j < stack.length; j++) {
        fill(255);
        rect(2,0,5,-stack[0]);
        rect(8,0,5,-stack[1]);
        rect(14,0,5,-stack[2]);
      }
      pop();

      //Indicator line
      stroke(255);
      line(mouseX,0,mouseX,this.h);
    }
    fill(0);
    noStroke();
    rect(this.w,0,-this.shadeW,this.h);

  pop();
}

HRDay.prototype.renderBeats = function() {
  this.canvas.background(0);
  this.shadeW = focusDay.w;

  this.rBeats = this.beats.slice(0);
  if (this.sorted) {
    sort(this.rBeats);
    reverse(this.rBeats);
  }

  var cum = this.startTime;

  for (var i = this.boundLeft ; i < this.boundRight; i++) {
    //Get a running average of the last 10 points to look for outliers
    var tot = 0;
    var c = 0;
    for (var j = i; j > i - 10; j--) {
      tot+= this.rBeats[j];
      c++;
    }
    var av = tot / c;

    //Don't render outliers.
    var minBeat = 100;
    var maxBeat = 1000;

      


    this.canvas.colorMode(HSB);

    if (i < 10 || abs(this.rBeats[i] - av) < 50) {

      var n = map(this.rBeats[i], minBeat, maxBeat, 0, 1);
      n = constrain(n, 0,1);
      var ni = 1 - n;

      var x = map(i, this.boundLeft, this.boundRight, 0, this.w);

      var c = this.canvas.color(80 + (ni * 180), 255, 50 + (200 * ni * ni));
      var ca = this.canvas.color(80 + (ni * 180), 255, 50 + (200 * ni * ni),5);

      this.canvas.stroke(ca);
      this.canvas.line(x,0,x,this.h);
      this.canvas.stroke(c);
      //this.canvas.line(x,this.h * n * 0.5,x,this.h - (this.h * n * 0.5));
      this.canvas.line(x,this.h * n,x,this.h);

      if (this.graphing) {
        this.canvas.stroke(255);
        this.canvas.point(x, this.h + (n * this.h));
      }

      
    }
    
  }
}

HRDay.prototype.requestHR = function(member, day) {

  var url = apiEndPoint + "?FeatureType=ambit_hr&Member=" + member + "&expeditionDay=" + day;
  console.log(url);
  var test = $.ajax({
    dataType: "json",
    url: url,
    context: this,
    success: this.receiveHR
  });

}

HRDay.prototype.receiveHR = function(data) {
  console.log(this);
  console.log(data);
  
  this.startTime = data.results.features[0].properties.t_utc;
  console.log("START TIME:" + this.startTime);
  this.beats = data.results.features[0].properties.Beats;

  var cum = this.startTime;
  for (var i = 0; i < this.beats.length; i++) {
    this.cumulativeBeats[i] = cum;
    cum += this.beats[i] / 1000;
  }

  totalHeartBeats += this.beats.length;
  totalBeats.html(totalHeartBeats + " heart beats.");
  this.boundRight = this.beats.length;
  this.renderBeats(this.beats, this.w, 100, false);
  this.loaded = true;
  this.tshadeW = 0;
}





















