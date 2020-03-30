import * as handpose from '@tensorflow-models/handpose';
import paper from 'paper/dist/paper-core';
import videoCanvas from 'video-canvas';
import DecorateHand from './Hand3000';
import clamp from 'clamp';

const canvasElement = document.querySelector('#canvas');
const music = document.querySelector('#audio');
const distanceElem = document.querySelector('#distance');
const pitchElem = document.querySelector('#pitch');
const spreadElem = document.querySelector('#spread');
const volumeElem = document.querySelector('#volume');
let video = document.querySelector('#video');
let model;
let volumeValue = 0;


paper.setup(canvasElement);
init();

const GROUP = new paper.Group();

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

  music.play();
  music.pause();

  canvas.getContext('2d').translate(640, 0);
  canvas.getContext('2d').scale(-1, 1);
  document.body.appendChild(canvas);

  video = canvas;
  vid.play();

  model = await handpose.load();
  DecorateHand(model);

  trackHands();
}

let prevFist;
let pausedFromDrop;
let timeout;
const map = (value, x1, y1, x2, y2) => (value - x1) * (y2 - x2) / (y1 - x1) + x2;

async function trackHands() {
  const predictions = await model.estimateHands(video);
  
  if (predictions.length > 0) {
    const {
      distance,
      spread,
      pitch,
      isFist,
    } = predictions[0];

    clearTimeout(timeout);
    // drawKeyPoints(predictions[0]);

    pitchElem.innerHTML = pitch.toFixed(2);
    distanceElem.innerHTML = distance.toFixed(2);
    spreadElem.innerHTML = spread.toFixed(2);
    volumeElem.innerHTML = isFist ? 'True' : 'False';

    if (pausedFromDrop) {
      music.play();
      pausedFromDrop = false;
    }

    if (!pausedFromDrop && prevFist !== isFist) {
      if (!music.paused || isFist) {
        music.pause();
      } else if (music.paused || !isFist) {
        music.play();
      }
    }
    
    const volumeValue = map(distance * spread, 3000, 15000, 0.02, 1);
    music.volume = clamp(volumeValue, 0.02, 1);

    prevFist = isFist;
    // prompt.style.transform = `translate3d(-50%, -50%, 0) rotateX(${Math.floor(averageZ)}deg)`;
  } else {
    timeout = setTimeout(() => {
      if (GROUP.children.length) {
        GROUP.removeChildren();
      }
  
      if (!music.paused) {
        music.pause();
        pausedFromDrop = true;
      }
  
      pitchElem.innerHTML = '-';
      distanceElem.innerHTML = '-';
      spreadElem.innerHTML = '-';
      volumeElem.innerHTML = '-';
    }, 250);
  }

  requestAnimationFrame(trackHands);
}

function drawKeyPoints(data) {
  const {
    landmarks,
  } = data;
  
  for (let i = 0; i < landmarks.length; i++) {
    const landmark = landmarks[i];
    const [x, y] = landmark;

    if (GROUP.children.length < landmarks.length) {
      const group = new paper.Group();
      const position = new paper.Point(x, y);
      const path = new paper.PointText();
      const label = new paper.PointText();
      
      path.position = position;
      path.content = '✿';
      path.fontSize = '20px';
      path.justification = 'center';

      label.position = position.add(12, 12);
      label.fontSize = '12px';
      label.content = i;

      group.addChildren([ path, label ]);
      group.fillColor = '#00ff62';
      GROUP.addChild(group);
    } else {
      GROUP.children[i].position.x = x;
      GROUP.children[i].position.y = y;
    }
  }
}