async function DecorateHand(model) {
  model.estimateMethod = model.estimateHands;

  const estimateHands = async (video, flipHorizontal) => {
    const predictions = await model.estimateMethod(video, flipHorizontal);
    return decorate(predictions);
  };

  model.estimateHands = estimateHands;
}

function decorate(predictions) {
  if (predictions.length > 0) {
    const { landmarks } = predictions[0];
    const isFist = getFist({
      tip: landmarks[12],
      base: landmarks[9],
      palm: landmarks[0],
    });
    const [ distance, spread, pitch ] = getDistance({
      base: landmarks[0],
      thumb: landmarks[1],
      tips: [
        landmarks[4],
        landmarks[8],
        landmarks[12],
        landmarks[16],
        landmarks[20],
      ],
    });
    const roll = (Math.atan2(
      landmarks[0][1] - landmarks[9][1],
      landmarks[0][0] - landmarks[9][0],
    ) * 180 / Math.PI) - 90;

    // let's return an array for now while
    // it only supports one hand detection
    return [
      {
      ...predictions[0],
        distance,
        spread,
        roll,
        pitch,
        isFist,
      },
    ];
  }
  
  return predictions;
}

function getDistance(args) {
  const {
    base,
    thumb,
    tips,
  } = args;
  const distance = Math.hypot(
    base[0] - thumb[0],
    base[1] - thumb[1],
  );
  const computed = tips.reduce((result, current, index) => {
    let spread = result.spread;
    let pitch = result.pitch + current[2];

    if (index < tips.length - 2) {
      const next = tips[index + 1];
      const addend = Math.hypot(
        next[0] - current[0],
        next[1] - current[1],
      );
  
      spread += addend;
    }

    return {
      pitch,
      spread,
    };
  }, {
    spread: 0,
    pitch: 0,
  });

  return [
    distance,
    computed.spread,
    -computed.pitch,
  ];
}

function getFist(args) {
  const {
    tip,
    base,
    palm,
  } = args;
  const baseDistance = Math.hypot(
    base[0] - palm[0],
    base[1] - palm[1],
  );
  const tipToPalm = Math.hypot(
    tip[0] - palm[0],
    tip[1] - palm[1],
  );

  return tipToPalm < baseDistance;
}

export default DecorateHand;

