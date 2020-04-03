# Hand3000
༼ つ ◕_◕ ༽つ

Currently an experimental and rudimentary decorator for TensorFlow's Handpose.

[Demo](https://ezekielaquino.com/Hand3000)

## What
TensorFlow's handpose only outputs a set of points described by x, y, z coordinates. This little experimental "decorator" just evaluates these points and decorates the output of `estimateHands` with values such as `distance`, `spread`, `roll`, `pitch`, `isFist`.

| Value      | Description                                                                                                             |
|------------|-------------------------------------------------------------------------------------------------------------------------|
| `distance` | An estimate of the hand distance from the camera. Basically a measurement between 2 of the "static" points in the model |
| `spread`   | An average calculation of the distance between fingertips                                                               |
| `roll`     | Like how an airplane moves, roll is the rotation in the x-axis                                                          |
| `pitch`    | Like how an airplane moves, roll is the rotation in the x-axis                                                          |
| `isFist`   | Not glamorously named, but it is what it says. A rough estimation IF a user's hand is closed                            |

## Usage
```js
  import * as handpose from '@tensorflow-models/handpose';
  import DecorateHand from 'Hand3000';

  // Initialize tensorflow as usual
  const model = await handpose.load();

  // Feed the model into Hand3000
  DecorateHand(model);

  // This just tweaks the estimateHand methods and adds
  // above computed values in the return of estimateHands
  const predictions = await model.estimateHands(source);
```