import * as handpose from '@tensorflow-models/handpose';
import paper from 'paper/dist/paper-core';
import videoCanvas from 'video-canvas';
import DecorateHand from 'hand3000';
import YouTubePlayer from 'youtube-player';
import clamp from 'clamp';

const canvasElement = document.querySelector('#canvas');
const distanceElem = document.querySelector('#distance');
const pitchElem = document.querySelector('#pitch');
const spreadElem = document.querySelector('#spread');
const volumeElem = document.querySelector('#volume');
const go = document.querySelector('#go');
let video = document.querySelector('#video');
let isUserInteracted = false;
let prevFist = false;
let pausedFromDrop = false;
let bBox, bRect, bLabel, marker, symbol;
let prevRotation = 0;
let minimum = 0;
let maximum = 0;
let timeout;
let player;
let model;
let tracked;
let GROUP;

setup();
setupGuides();
init();

function setup() {
  const url = new URL(document.location);
  const videoId = url.searchParams.get('video_id') || 'OuPupCQqNaY';
  
  go.addEventListener('click', () => {
    isUserInteracted = true;
  });

  player = YouTubePlayer('youtube');
  player.loadVideoById(videoId);
  player.pauseVideo();

  paper.setup(canvasElement);
}

function setupGuides() {
  GROUP = new paper.Group();
  bBox = new paper.Group();
  bRect = new paper.Path.Rectangle(
    new paper.Point(0, 0),
    new paper.Size(10, 10),
  );
  bLabel = new paper.PointText();
  marker = new paper.PointText();

  bRect.strokeColor = '#00ff62';
  bRect.strokeWidth = 1;

  bLabel.fillColor = '#00ff62';
  bLabel.position = bRect.bounds.topLeft;
  bLabel.fontSize = '32px';
  bBox.addChildren([bRect, bLabel]);

  marker.content = '✿';
  marker.fontSize = '16px';
  marker.fillColor = '#00ff62';
  marker.justification = 'center';
  
  symbol = new paper.SymbolDefinition(marker);
}

async function setupCamera() {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      facingMode: 'user',
      width: 640,
      height: 480,
    },
  });

  video.srcObject = stream;
  
  return new Promise(resolve => {
    video.onloadedmetadata = () => {
      resolve(video);
    };
  });
}

async function init() {
  const vid = await setupCamera();
  const canvas = videoCanvas(vid);

  // Flip the video feed when rendering onto canvas
  canvas.getContext('2d').translate(640, 0);
  canvas.getContext('2d').scale(-1, 1);
  document.querySelector('#banana').appendChild(canvas);

  video = canvas;
  vid.play();

  /**
   * (✿◠‿◠)
   * This is where we decorate the hand model with some
   * of our calculated values using Hand3000
   */
  // First initialiase handpose as in docs
  model = await handpose.load();

  // We pass in that model into Hand3000
  // this simply decorates the return value of
  // model.estimateHands with computed vals
  DecorateHand(model);

  trackHands();
}

async function trackHands() {
  const predictions = await model.estimateHands(video);

  if (!tracked && isUserInteracted) {
    tracked = true;
    document.querySelector('.loading').remove();
  }
  
  if (predictions.length > 0) {
    const {
      distance,
      spread,
      // roll, -> rotation on the x axis
      // pitch, -> pitch is the rotation on the z axis
      isFist,
    } = predictions[0];
    const value = distance * spread;

    clearTimeout(timeout);
    drawKeyPoints(predictions[0]);
    updateHtmlPrompts(predictions[0]);

    // Drumroll: The if train!
    if (pausedFromDrop) {
      player.playVideo();
      pausedFromDrop = false;
    }
    if (prevFist !== undefined || (!pausedFromDrop && prevFist !== isFist)) {
      if (isFist) {
        player.pauseVideo();
      } else {
        player.playVideo();
      }
    }
    if (prevFist === undefined) {
      player.playVideo();
    }
    if (minimum === 0 || value < minimum) {
      minimum = value;
    }
    if (value > maximum) {
      maximum = value;
    }

    const volumeValue = map(value, minimum, maximum, 4, 100);

    bLabel.content = isFist ? 'Paused' : `volume: ${volumeValue.toFixed(2)}`;
    player.setVolume(clamp(volumeValue, 4, 100));
    prevFist = isFist;
  } else {
    timeout = setTimeout(() => {
      if (GROUP.children.length) {
        GROUP.removeChildren();
      }
  
      player.pauseVideo();
      pausedFromDrop = true;
      bBox.position.x = -9999;
  
      updateHtmlPrompts({ reset: true });
    }, 250);
  }

  requestAnimationFrame(trackHands);
}

function updateHtmlPrompts({ pitch, distance, spread, isFist, reset }) {
  if (reset) {
    pitchElem.innerHTML = '-';
    distanceElem.innerHTML = '-';
    spreadElem.innerHTML = '-';
    volumeElem.innerHTML = '-';
    return;
  }

  pitchElem.innerHTML = pitch.toFixed(2);
  distanceElem.innerHTML = distance.toFixed(2);
  spreadElem.innerHTML = spread.toFixed(2);
  volumeElem.innerHTML = isFist ? 'True' : 'False';
}

function drawKeyPoints(data) {
  const {
    roll,
    landmarks,
    boundingBox,
  } = data;

  bRect.bounds.width = (boundingBox.bottomRight[0] - boundingBox.topLeft[0]) / 1;
  bRect.bounds.height = (boundingBox.bottomRight[1] - boundingBox.topLeft[1]) / 1;
  bLabel.position = bRect.bounds.center;
  bBox.rotation += (roll - prevRotation);
  bBox.position.x = boundingBox.topLeft[0] + (bBox.bounds.width / 2);
  bBox.position.y = boundingBox.topLeft[1] + (bBox.bounds.height / 2);

  prevRotation = roll;

  for (let i = 0; i < landmarks.length; i++) {
    const landmark = landmarks[i];
    const [x, y] = landmark;

    if (GROUP.children.length < landmarks.length) {
      const position = new paper.Point(x, y);
      const path = symbol.place(position);
      GROUP.addChild(path);
    } else {
      GROUP.children[i].position.x = x;
      GROUP.children[i].position.y = y;
    }
  }
}

function map(value, x1, y1, x2, y2) {
  return (value - x1) * (y2 - x2) / (y1 - x1) + x2;
}