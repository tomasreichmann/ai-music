import type { LyricsArtifact } from "../../lib/types";
import { anchorSection, line } from "../../lib/lyrics-anchors";

const chorusHookWeights = [1, 1.12, 0.98, 0.54, 0.54, 1.82];
const dropLineWeights = [0.9, 0.9, 1.2, 0.55, 0.55, 0.55, 1.85];
const shortDropWeights = [1.2, 0.62, 0.62, 0.62, 1.94];

const referenceText = `[Intro]
Found a white baggie...
He he
Uuuuu!
Found a white baggie lying on a toilet floor...
Looked at all the treasure, I decided to explore.
I prepared a nice fatty and snorted what I got.
This is when I realized it wasn't what I thought.

[Verse 1]
Push the toilet door, step away from the sink
Legs turn to jelly, now I'm hovering I think
Suddenly the sound wave hits me like a symphony
Every single frequency is singing right into me
Try to pull a bird but my vocal cords are breaking
Speaking double Dutch with the noises that I'm making
Watches stop ticking, I'm flying into space
Getting swallowed by a portal in the middle of the bass

[Buildup]
(oh)...
(oi)...
(eh)...
(ugh)...
Doorway wobbling and the hallway sways
Knees doing stand-up to the snare-roll craze
Try to look cool, but my grin misbehaves
Drop me by the bass

[Chorus]
Lost another hour to the bass
Lost another hour to the bass
Swear it was eleven now there's sunlight in my face
Moving in slow motion while the tempo sets the pace
Lost another hour to the bass
Lost another hour to the bass
Looking for my mates but they vanished from the place
Floating through the venue like I'm lost in outer space

[Verse 2]
Clock on the wall starts dripping like paint
Blink once slow and the room ain't straight
Eyes closed tight, then the dark goes deep
Falling through tiles while the kick stays sweet
Same girl passes, says, "You all right?"
I say, "All g--" then the sentence takes flight
Head says pause but the buzz says chase
So I do some more and lean back to the bass

[Buildup 2]
(OH)...
(OI)...
(EH)...
(UUUGH)...
Clock hands spinning like they're late for the chase
I argue with my shoelace in the laser haze
Whole room laughing while I roll over the place
Drop, Drop, Drop me by the bass

[Chorus 2]
Lost another hour to the bass
Lost another hour to the bass
Swear it was eleven now there's sunlight in my face
Moving in slow motion while the tempo sets the pace
Lost another hour to the bass
Lost another hour to the bass
Looking for my mates but they vanished from the place
Floating through the venue like I'm lost in outer space

[Bridge]
Bass still wicked, but the joke went south
Hand on the rail, hand over mouth
Back door dash and a cold night breeze
One loud heave by the trash bins, please
Shoes still tapping, pride in bits
Lesson hits late when the stomach flips

[Outro]
Lost another hour to the bass
Lost another hour to the bass
Sunlight on the pavement and I'm still out of place
Maybe random baggie ain't a treasure worth a chase`;

export const lostAnotherHourLyrics: LyricsArtifact = {
  songId: "lost-another-hour-to-the-bass",
  audioPath: "outputs/tracks/Lost Another Hour to the Bass.wav",
  source: "reference-draft-with-anchors",
  referenceText,
  lines: [
    ...anchorSection("intro", 13, [
      {
        text: "Found a white baggie...",
        beats: 3,
        startBeat: 13,
        endBeat: 16,
        gapAfter: 5
      },
      {
        text: "He he",
        beats: 2,
        startBeat: 21,
        endBeat: 23,
        gapAfter: 2
      },
      {
        text: "Uuuuu!",
        beats: 2,
        startBeat: 25,
        endBeat: 27,
        gapAfter: 0
      },
      {
        text: "Found a white baggie lying on a toilet floor...",
        beats: 8,
        startBeat: 27,
        endBeat: 35
      },
      line("Looked at all the treasure, I decided to explore.", 8.5),
      line("I prepared a nice fatty and snorted what I got.", 7.5),
      line("This is when I realized it wasn't what I thought.", 8.5)
    ]),
    ...anchorSection("verse1", 33, [
      line("Push the toilet door, step away from the sink", 7.5),
      line("Legs turn to jelly, now I'm hovering I think", 8),
      line("Suddenly the sound wave hits me like a symphony", 8.5),
      line("Every single frequency is singing right into me", 8),
      line("Try to pull a bird but my vocal cords are breaking", 8.5),
      line("Speaking double Dutch with the noises that I'm making", 7.5),
      line("Watches stop ticking, I'm flying into space", 7.5),
      line("Getting swallowed by a portal in the middle of the bass", 8.5)
    ]),
    ...anchorSection("buildup1", 97, [
      line("(oh)...", 1.5),
      line("(oi)...", 1.5),
      line("(eh)...", 1.5),
      line("(ugh)...", 2.5),
      line("Doorway wobbling and the hallway sways", 6.5),
      line("Knees doing stand-up to the snare-roll craze", 6.5),
      line("Try to look cool, but my grin misbehaves", 6.5),
      line("Drop me by the bass", 5.5, shortDropWeights)
    ]),
    ...anchorSection("chorus1", 129, [
      line("Lost another hour to the bass", 11, chorusHookWeights),
      line("Lost another hour to the bass", 11, chorusHookWeights),
      line("Swear it was eleven now there's sunlight in my face", 13.5),
      line("Moving in slow motion while the tempo sets the pace", 12.5),
      line("Lost another hour to the bass", 11, chorusHookWeights),
      line("Lost another hour to the bass", 11, chorusHookWeights),
      line("Looking for my mates but they vanished from the place", 13),
      line("Floating through the venue like I'm lost in outer space", 13)
    ]),
    ...anchorSection("verse2", 225, [
      line("Clock on the wall starts dripping like paint", 7.5),
      line("Blink once slow and the room ain't straight", 7.5),
      line("Eyes closed tight, then the dark goes deep", 8),
      line("Falling through tiles while the kick stays sweet", 8),
      line("Same girl passes, says, \"You all right?\"", 8.5),
      line("I say, \"All g--\" then the sentence takes flight", 7.5),
      line("Head says pause but the buzz says chase", 8),
      line("So I do some more and lean back to the bass", 9)
    ]),
    ...anchorSection("buildup2", 289, [
      line("(OH)...", 1.5),
      line("(OI)...", 1.5),
      line("(EH)...", 1.5),
      line("(UUUGH)...", 2.5),
      line("Clock hands spinning like they're late for the chase", 6.5),
      line("I argue with my shoelace in the laser haze", 6.5),
      line("Whole room laughing while I roll over the place", 6),
      line("Drop, Drop, Drop me by the bass", 6.5, dropLineWeights)
    ]),
    ...anchorSection("chorus2", 321, [
      line("Lost another hour to the bass", 11, chorusHookWeights),
      line("Lost another hour to the bass", 11, chorusHookWeights),
      line("Swear it was eleven now there's sunlight in my face", 13.5),
      line("Moving in slow motion while the tempo sets the pace", 12.5),
      line("Lost another hour to the bass", 11, chorusHookWeights),
      line("Lost another hour to the bass", 11, chorusHookWeights),
      line("Looking for my mates but they vanished from the place", 13),
      line("Floating through the venue like I'm lost in outer space", 13)
    ]),
    ...anchorSection("bridge", 417, [
      line("Bass still wicked, but the joke went south", 8),
      line("Hand on the rail, hand over mouth", 7.5),
      line("Back door dash and a cold night breeze", 8),
      line("One loud heave by the trash bins, please", 8.5),
      line("Shoes still tapping, pride in bits", 7.5),
      line("Lesson hits late when the stomach flips", 8.5)
    ]),
    ...anchorSection("outro", 465, [
      line("Lost another hour to the bass", 10.5, chorusHookWeights),
      line("Lost another hour to the bass", 10.5, chorusHookWeights),
      line("Sunlight on the pavement and I'm still out of place", 13),
      line("Maybe random baggie ain't a treasure worth a chase", 14)
    ])
  ]
};
