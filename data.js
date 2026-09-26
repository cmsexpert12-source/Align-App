/* ALIGN — bodyweight week: push, pull, legs, core, recover */
window.ALIGN_DATA = (() => {
  const E = (id, name, pattern, muscles, kind, svg, cues, original = false, alts = []) => ({
    id, name, pattern, muscles, kind, svg, cues, original, alts
  });

  const exercises = {
    "jumping-jacks": E("jumping-jacks", "Jumping Jacks", "warmup", ["Full body", "Cardio"], "time", "jacks",
      ["Land softly", "Arms fully overhead", "Keep a light bounce"], true),
    "arm-circles": E("arm-circles", "Arm Circles", "warmup", ["Shoulders"], "reps", "arms",
      ["Arms long", "Controlled circles", "Reverse halfway if it feels good"], true),
    "inchworms": E("inchworms", "Inchworms", "warmup", ["Hamstrings", "Core", "Shoulders"], "reps", "inchworm",
      ["Walk hands out to a plank", "Hips stay steady", "Walk feet back to hands"], true),
    "burpees": E("burpees", "Burpees", "warmup", ["Full body"], "reps", "burpee",
      ["Chest to the floor or a strong plank", "Stand up tall", "Jump only if it feels snappy"], true),

    "push-ups": E("push-ups", "Push-Ups", "push", ["Chest", "Triceps", "Shoulders"], "reps", "pushup",
      ["Hands under shoulders", "Body in one line", "Lower with control, press the floor away"], true, ["knee-push-ups", "wide-arm-push-ups"]),
    "knee-push-ups": E("knee-push-ups", "Knee Push-Ups", "push", ["Chest", "Triceps"], "reps", "pushup",
      ["Knees down, hips in line", "Same push-up path as the full version"], true, ["push-ups"]),
    "diamond-push-ups": E("diamond-push-ups", "Diamond Push-Ups", "push", ["Triceps", "Chest"], "reps", "pushup",
      ["Hands form a diamond", "Elbows graze the ribs", "Don't let hips sag"], true),
    "wide-arm-push-ups": E("wide-arm-push-ups", "Wide Arm Push-Ups", "push", ["Chest", "Shoulders"], "reps", "pushup",
      ["Hands outside shoulder width", "Chest leads the way down"], true),
    "staggered-push-ups": E("staggered-push-ups", "Staggered Push-Ups", "push", ["Chest", "Shoulders", "Core"], "reps", "pushup",
      ["One hand slightly forward", "Switch sides every set", "Keep hips square"], true),
    "decline-push-ups": E("decline-push-ups", "Decline Push-Ups", "push", ["Upper chest", "Shoulders"], "reps", "decline",
      ["Feet on a chair or step", "Don't shrug the shoulders", "Stop if wrists complain"], true),
    "hindu-push-ups": E("hindu-push-ups", "Hindu Push-Ups", "push", ["Chest", "Shoulders", "Spine"], "reps", "hindu",
      ["Pike to a swoop", "Hips lead, then chest opens", "Smooth, not bouncy"], true),
    "spiderman-push-ups": E("spiderman-push-ups", "Spiderman Push-Ups", "push", ["Chest", "Obliques", "Hips"], "reps", "spider",
      ["Knee to elbow as you lower", "Alternate sides", "Hips stay quiet"], true),
    "pike-push-ups": E("pike-push-ups", "Pike Push Ups", "push", ["Shoulders", "Triceps"], "reps", "pike",
      ["Hips high, head toward the floor", "Elbows 45 degrees", "This is your overhead press"], true),
    "reverse-push-ups": E("reverse-push-ups", "Reverse Push-Ups", "push", ["Shoulders", "Upper back"], "reps", "reverse",
      ["From a low plank, push hips back to pike", "Arms stay long", "Feel the shoulders open"], true),
    "hover-push-up": E("hover-push-up", "Hover Push Up", "pull", ["Serratus", "Shoulders"], "reps", "hover",
      ["Lock a plank", "Protract and retract the shoulder blades", "Tiny, honest range"], true),
    "supine-push-up": E("supine-push-up", "Supine Push Up", "pull", ["Back", "Glutes"], "reps", "bridge",
      ["Lie on your back, press through the floor", "Squeeze glutes at the top"], true),
    "floor-tricep-dips": E("floor-tricep-dips", "Floor Tricep Dips", "push", ["Triceps", "Shoulders"], "reps", "dip",
      ["Fingers toward hips", "Elbows back, not flared", "Hips stay close to your hands"], true),
    "push-up-rotation": E("push-up-rotation", "Push-Up & Rotation", "push", ["Chest", "Obliques", "Shoulders"], "reps", "rotate",
      ["Push-up, then open to a side plank", "Reach the ceiling", "Alternate sides"], true),

    "back-bow-pulls": E("back-bow-pulls", "Back Bow Pulls", "pull", ["Lower back", "Glutes", "Rear delts"], "reps", "superman",
      ["Lift chest and legs together", "Pull elbows toward hips", "Don't crank the neck"], true),
    "floor-y-raises": E("floor-y-raises", "Floor Y Raises", "pull", ["Lower traps", "Rear delts"], "reps", "yraise",
      ["Thumbs up, arms in a Y", "Lift from the mid-back", "Pause at the top"], true),
    "reverse-snow-angels": E("reverse-snow-angels", "Reverse Snow Angels", "pull", ["Rear delts", "Upper back"], "reps", "angel",
      ["Face down, sweep arms in a wide arc", "Keep thumbs off the floor", "Slow"], true),
    "hyperextension": E("hyperextension", "Hyperextension", "pull", ["Lower back", "Glutes"], "reps", "hyper",
      ["Lift chest, squeeze glutes", "Stop before the low back pinches"], true),
    "superman-hold": E("superman-hold", "Superman Hold", "pull", ["Posterior chain"], "time", "superman",
      ["Chest and thighs off the floor", "Reach long, not high", "Breathe"], false),
    "prone-t-raises": E("prone-t-raises", "Prone T Raises", "pull", ["Rear delts", "Mid-back"], "reps", "yraise",
      ["Arms out to a T, thumbs up", "Pinch the shoulder blades"], false),
    "bird-dog": E("bird-dog", "Bird Dog", "pull", ["Core", "Glutes", "Back"], "reps", "birddog",
      ["Opposite arm and leg", "Square hips", "Pause 1 second at full reach"], false),
    "towel-rows": E("towel-rows", "Towel Door Rows", "pull", ["Lats", "Biceps", "Mid-back"], "reps", "row",
      ["Loop a towel around a closed door", "Lean back, pull chest to the door", "Squeeze, then lower slow"], false),

    "squats": E("squats", "Bodyweight Squats", "legs", ["Quads", "Glutes"], "reps", "squat",
      ["Feet about shoulder width", "Sit between the heels", "Chest proud, knees track toes"], false, ["sumo-squats"]),
    "sumo-squats": E("sumo-squats", "Sumo Squats", "legs", ["Glutes", "Inner thighs", "Quads"], "reps", "squat",
      ["Wide stance, toes out", "Sit straight down", "Squeeze glutes to stand"], false),
    "reverse-lunges": E("reverse-lunges", "Reverse Lunges", "legs", ["Quads", "Glutes"], "reps", "lunge",
      ["Step back, drop the back knee", "Front heel stays planted", "Alternate or finish one side"], false),
    "glute-bridge": E("glute-bridge", "Glute Bridge", "legs", ["Glutes", "Hamstrings"], "reps", "bridge",
      ["Ribs down, squeeze glutes", "Don't arch through the low back"], true),
    "sl-glute-bridge": E("sl-glute-bridge", "Single-Leg Glute Bridge", "legs", ["Glutes", "Hamstrings"], "reps", "bridge",
      ["One foot planted, other leg long", "Hips stay level"], false),
    "wall-sit": E("wall-sit", "Wall Sit", "legs", ["Quads"], "time", "wallsit",
      ["Back flat on the wall", "Knees at 90 if you can", "Breathe, don't hold"], false),
    "calf-raises": E("calf-raises", "Calf Raises", "legs", ["Calves"], "reps", "calf",
      ["Rise onto the big toe", "Pause, lower slow"], false),
    "donkey-kicks": E("donkey-kicks", "Donkey Kicks", "legs", ["Glutes"], "reps", "kick",
      ["On all fours, heel to the ceiling", "Don't swing the low back"], false),
    "good-mornings": E("good-mornings", "Good Mornings", "legs", ["Hamstrings", "Glutes", "Back"], "reps", "goodmorn",
      ["Soft knees, hinge at the hips", "Spine long", "Feel the hamstrings load"], false),
    "standing-kickbacks": E("standing-kickbacks", "Standing Kickbacks", "legs", ["Glutes"], "reps", "kick",
      ["Light hold on a wall", "Kick back without leaning forward"], false),
    "fire-hydrants": E("fire-hydrants", "Fire Hydrants", "legs", ["Glutes", "Hips"], "reps", "kick",
      ["On all fours, lift the knee out to the side", "Hips stay square"], false),

    "sit-ups": E("sit-ups", "Sit-Ups", "core", ["Abs"], "reps", "situp",
      ["Feet grounded", "Lead with the chest, not the neck"], true),
    "crunches-raised": E("crunches-raised", "Crunches With Legs Raised", "core", ["Abs"], "reps", "crunch",
      ["Legs at 90", "Shorten the ribs to the hips"], true),
    "bicycle-crunches": E("bicycle-crunches", "Bicycle Crunches", "core", ["Abs", "Obliques"], "reps", "bicycle",
      ["Shoulder toward opposite knee", "Slow enough to feel"], true),
    "russian-twist": E("russian-twist", "Russian Twist", "core", ["Obliques"], "reps", "twist",
      ["Chest up", "Rotate the ribcage, not just the hands"], true),
    "mountain-climber": E("mountain-climber", "Mountain Climber", "core", ["Core", "Hip flexors", "Cardio"], "reps", "mountain",
      ["Plank first, then drive knees", "Hips stay level"], true),
    "leg-raises": E("leg-raises", "Leg Raises", "core", ["Lower abs", "Hip flexors"], "reps", "legraise",
      ["Low back pressed down", "Lower legs only as far as you stay glued"], true),
    "crossover-crunch": E("crossover-crunch", "Crossover Crunch", "core", ["Obliques"], "reps", "crunch",
      ["Elbow toward opposite knee", "Other leg stays long"], true),
    "v-up": E("v-up", "V-Up", "core", ["Abs"], "reps", "vup",
      ["Reach hands to feet", "Control the lower"], true),
    "plank": E("plank", "Plank", "core", ["Core", "Shoulders"], "time", "plank",
      ["Squeeze glutes", "Push the floor away", "Don't dump into the low back"], true),
    "side-plank": E("side-plank", "Side Plank", "core", ["Obliques", "Shoulders"], "time", "sideplank",
      ["Feet stacked or staggered", "Hips high", "Top arm can rest on the hip"], true),
    "side-bridges": E("side-bridges", "Side Bridges", "core", ["Obliques", "Glutes"], "reps", "sideplank",
      ["From the side, lift and lower the hips", "Short, strong reps"], true),
    "dead-bug": E("dead-bug", "Dead Bug", "core", ["Deep core"], "reps", "deadbug",
      ["Low back glued to the floor", "Opposite arm and leg reach long"], false),
    "hollow-hold": E("hollow-hold", "Hollow Body Hold", "core", ["Abs"], "time", "hollow",
      ["Lower back pressed down", "Shoulders and legs hover", "Breathe shallow and steady"], false),
    "reclined-oblique": E("reclined-oblique", "Reclined Oblique Twist", "core", ["Obliques"], "reps", "twist",
      ["Shoulders stay down", "Legs lower as a unit, only as far as control"], true),

    "shoulder-stretch": E("shoulder-stretch", "Shoulder Stretch", "mobility", ["Shoulders"], "time", "stretch-stand",
      ["Pull the arm across the chest", "Shoulder down, not shrugged"], true),
    "cobra-stretch": E("cobra-stretch", "Cobra Stretch", "mobility", ["Spine", "Hip flexors"], "time", "cobra",
      ["Hands under shoulders", "Lift the chest, hips heavy"], true),
    "chest-stretch": E("chest-stretch", "Chest Stretch", "mobility", ["Chest", "Shoulders"], "time", "stretch-stand",
      ["Forearm on a wall or doorframe", "Turn away until you feel the pec"], true),
    "cat-cow": E("cat-cow", "Cat Cow Pose", "mobility", ["Spine"], "time", "catcow",
      ["Slow rounds", "Move one vertebra at a time"], true),
    "childs-pose": E("childs-pose", "Child's Pose", "mobility", ["Back", "Hips"], "time", "child",
      ["Hips to heels", "Arms reach or rest by the sides", "Breathe into the back"], true),
    "side-lying-stretch": E("side-lying-stretch", "Side-Lying Floor Stretch", "mobility", ["Lats", "Obliques"], "time", "sidelying",
      ["Lie on your side, reach the top arm overhead", "Long waist"], true),
    "lumbar-twist": E("lumbar-twist", "Spine Lumbar Twist Stretch", "mobility", ["Spine", "Glutes"], "time", "twiststretch",
      ["Shoulders stay down", "Let the knees fall", "Breathe"], true),
    "hip-flexor": E("hip-flexor", "Hip Flexor Stretch", "mobility", ["Hip flexors"], "time", "lunge",
      ["Kneeling lunge", "Tuck the pelvis, then shift forward"], false),
    "forward-fold": E("forward-fold", "Forward Fold", "mobility", ["Hamstrings", "Back"], "time", "fold",
      ["Soft knees", "Hang, don't yank"], false),
    "quad-stretch": E("quad-stretch", "Quad Stretch", "mobility", ["Quads"], "time", "stretch-stand",
      ["Hold the foot, knees together", "Stand tall"], false),
    "worlds-greatest": E("worlds-greatest", "World's Greatest Stretch", "mobility", ["Hips", "T-spine", "Hamstrings"], "time", "lunge",
      ["Long lunge", "Elbow inside the front foot", "Then reach that arm to the sky"], false),
    "down-dog": E("down-dog", "Downward Dog", "mobility", ["Shoulders", "Hamstrings", "Calves"], "time", "pike",
      ["Push the floor away", "Heels reach down, knees can bend"], false),
    "hamstring-stretch": E("hamstring-stretch", "Hamstring Stretch", "mobility", ["Hamstrings"], "time", "fold",
      ["Hinge, keep a long spine", "Only go as far as a stretch, not a strain"], false),
    "breathing": E("breathing", "Box Breathing", "mobility", ["Nervous system"], "time", "breath",
      ["In 4, hold 4, out 4, hold 4", "Sit or lie down", "This is training too"], false)
  };

  const item = (id, target, side = null) => ({ id, target, side });

  const days = [
    {
      id: "sun-push",
      dow: 0,
      name: "Sunday Push",
      short: "Push",
      subtitle: "Express · church morning",
      minutes: 12,
      pattern: "push",
      origin: "Sunday mode · leave by 5:45",
      why: "Twelve minutes of push so the rest of the morning stays free: pray, one chapter, out the door.",
      items: [
        item("jumping-jacks", 20),
        item("arm-circles", 12),
        item("push-ups", 12),
        item("staggered-push-ups", 8),
        item("diamond-push-ups", 8),
        item("hindu-push-ups", 8),
        item("shoulder-stretch", 20),
        item("chest-stretch", 20)
      ]
    },
    {
      id: "mon-core",
      dow: 1,
      name: "Core & Hips",
      short: "Core",
      subtitle: "Abs, obliques, glutes",
      minutes: 26,
      pattern: "core",
      origin: "The trunk that holds the week",
      why: "A serious abs circuit, plus hips and anti-extension so your core works in more than one direction.",
      items: [
        item("jumping-jacks", 30),
        item("crunches-raised", 20),
        item("sit-ups", 18),
        item("mountain-climber", 20),
        item("russian-twist", 24),
        item("plank", 45),
        item("glute-bridge", 20),
        item("sl-glute-bridge", 10, "L"),
        item("sl-glute-bridge", 10, "R"),
        item("side-bridges", 16, "L"),
        item("side-bridges", 16, "R"),
        item("v-up", 12),
        item("leg-raises", 18),
        item("dead-bug", 12),
        item("bird-dog", 10),
        item("cobra-stretch", 30),
        item("lumbar-twist", 30, "L"),
        item("lumbar-twist", 30, "R")
      ]
    },
    {
      id: "tue-pull",
      dow: 2,
      name: "Pull & Posture",
      short: "Pull",
      subtitle: "Back, rear delts, scapula",
      minutes: 28,
      pattern: "pull",
      origin: "The other half of every press",
      why: "Floor back work plus rows, so pushing never owns the week.",
      items: [
        item("jumping-jacks", 30),
        item("inchworms", 8),
        item("cat-cow", 30),
        item("back-bow-pulls", 16),
        item("floor-y-raises", 16),
        item("reverse-snow-angels", 14),
        item("prone-t-raises", 12),
        item("superman-hold", 20),
        item("hyperextension", 16),
        item("hover-push-up", 12),
        item("supine-push-up", 12),
        item("bird-dog", 10),
        item("towel-rows", 12),
        item("pike-push-ups", 8),
        item("floor-tricep-dips", 10),
        item("childs-pose", 30),
        item("side-lying-stretch", 30, "L"),
        item("side-lying-stretch", 30, "R")
      ]
    },
    {
      id: "wed-legs",
      dow: 3,
      name: "Lower Body",
      short: "Legs",
      subtitle: "Quads, glutes, hamstrings, calves",
      minutes: 30,
      pattern: "legs",
      origin: "Home floor. No gear.",
      why: "Squats, lunges, hinges, calves — the work most morning routines skip.",
      items: [
        item("jumping-jacks", 30),
        item("arm-circles", 12),
        item("squats", 20),
        item("reverse-lunges", 12, "L"),
        item("reverse-lunges", 12, "R"),
        item("glute-bridge", 20),
        item("wall-sit", 40),
        item("sumo-squats", 15),
        item("calf-raises", 20),
        item("donkey-kicks", 12, "L"),
        item("donkey-kicks", 12, "R"),
        item("good-mornings", 12),
        item("fire-hydrants", 12, "L"),
        item("fire-hydrants", 12, "R"),
        item("standing-kickbacks", 12, "L"),
        item("standing-kickbacks", 12, "R"),
        item("forward-fold", 30),
        item("hip-flexor", 30, "L"),
        item("hip-flexor", 30, "R"),
        item("quad-stretch", 20, "L"),
        item("quad-stretch", 20, "R")
      ]
    },
    {
      id: "thu-core",
      dow: 4,
      name: "Core Control",
      short: "Core",
      subtitle: "Abs, anti-extension, sides",
      minutes: 24,
      pattern: "core",
      origin: "Second core day, cleaner finish",
      why: "The abs circuit, finished with hollow and plank instead of another crunch round.",
      items: [
        item("jumping-jacks", 30),
        item("sit-ups", 18),
        item("bicycle-crunches", 22),
        item("russian-twist", 24),
        item("mountain-climber", 20),
        item("leg-raises", 20),
        item("crossover-crunch", 18),
        item("plank", 40),
        item("side-plank", 26, "R"),
        item("side-plank", 26, "L"),
        item("push-up-rotation", 12),
        item("hollow-hold", 20),
        item("glute-bridge", 15),
        item("cobra-stretch", 30),
        item("cat-cow", 30),
        item("lumbar-twist", 30, "L"),
        item("lumbar-twist", 30, "R")
      ]
    },
    {
      id: "fri-upper",
      dow: 5,
      name: "Upper Mix",
      short: "Upper",
      subtitle: "Shoulders, triceps, back",
      minutes: 28,
      pattern: "push",
      origin: "The full upper day",
      why: "Pikes, dips, reverse push-ups, and the back circuit. Saturday can actually recover.",
      items: [
        item("jumping-jacks", 30),
        item("burpees", 6),
        item("knee-push-ups", 16),
        item("floor-tricep-dips", 14),
        item("pike-push-ups", 12),
        item("reverse-push-ups", 10),
        item("hindu-push-ups", 8),
        item("diamond-push-ups", 10),
        item("back-bow-pulls", 16),
        item("hover-push-up", 12),
        item("hyperextension", 14),
        item("reverse-snow-angels", 12),
        item("floor-y-raises", 12),
        item("side-lying-stretch", 30, "L"),
        item("side-lying-stretch", 30, "R"),
        item("cat-cow", 30),
        item("childs-pose", 30)
      ]
    },
    {
      id: "sat-recover",
      dow: 6,
      name: "Recover",
      short: "Recover",
      subtitle: "Mobility, easy legs, breathing",
      minutes: 16,
      pattern: "mobility",
      origin: "You still open the app",
      why: "Open the joints, breathe, keep the legs alive. No grinding the same pattern a third time.",
      items: [
        item("jumping-jacks", 20),
        item("arm-circles", 15),
        item("worlds-greatest", 30, "L"),
        item("worlds-greatest", 30, "R"),
        item("cat-cow", 40),
        item("down-dog", 30),
        item("glute-bridge", 12),
        item("squats", 12),
        item("bird-dog", 8),
        item("dead-bug", 8),
        item("hamstring-stretch", 30, "L"),
        item("hamstring-stretch", 30, "R"),
        item("chest-stretch", 30),
        item("shoulder-stretch", 30),
        item("childs-pose", 45),
        item("breathing", 60)
      ]
    }
  ];

  const cloneDay = (d, extra) => {
    const n = Object.assign({}, d, extra || {});
    n.items = (extra && extra.items) ? extra.items : (d.items || []).map((it) => Object.assign({}, it));
    return n;
  };
  const dAt = (dow) => days.find((d) => d.dow === dow);

  const strengthDays = [
    cloneDay(dAt(0), { id: "str-sun", name: "Sunday Press", subtitle: "Short press · church morning", minutes: 14, why: "A slightly fuller press still short enough to pray, read, and leave." }),
    cloneDay(dAt(2), { id: "str-mon", dow: 1, name: "Pull Strength", subtitle: "Back, rows, posture", minutes: 30, why: "Start the week on pull so pressing later has something to sit on." }),
    cloneDay(dAt(3), { id: "str-tue", dow: 2, name: "Leg Strength", subtitle: "Squat, lunge, hinge", minutes: 32, why: "The heaviest lower day. Home floor, no gear." }),
    cloneDay(dAt(5), { id: "str-wed", dow: 3, name: "Upper Strength", subtitle: "Pikes, dips, back", minutes: 30, why: "The full upper mix in the middle of the week." }),
    cloneDay(dAt(1), { id: "str-thu", dow: 4, name: "Core Strength", subtitle: "Abs, hollow, sides", minutes: 26, why: "Trunk work so the heavy days stay honest." }),
    cloneDay(dAt(2), { id: "str-fri", dow: 5, name: "Pull again", subtitle: "Back and scapula", minutes: 28, why: "A second pull so the week does not lean forward." }),
    cloneDay(dAt(6), { id: "str-sat", name: "Easy strength", subtitle: "Light legs, breath", minutes: 18, why: "Keep the pattern without grinding. Sunday can stay short." })
  ];

  const mobilityDays = [
    cloneDay(dAt(6), { id: "mob-sun", dow: 0, name: "Sunday Open", subtitle: "Joints and breath", minutes: 10, pattern: "mobility", origin: "Light Sunday", why: "Open the body. Keep the rest of the morning free." }),
    cloneDay(dAt(6), { id: "mob-mon", dow: 1, name: "Easy trunk", subtitle: "Hips, spine, breath", minutes: 16, why: "A light start. Move, don’t grind." }),
    cloneDay(dAt(2), { id: "mob-tue", dow: 2, name: "Open the back", subtitle: "Pull, posture, stretch", minutes: 18, why: "Floor back work and length, not a heavy pull." }),
    cloneDay(dAt(6), { id: "mob-wed", dow: 3, name: "Easy legs", subtitle: "Hinge, squat, stretch", minutes: 18, pattern: "legs", why: "Keep the legs alive without a long session." }),
    cloneDay(dAt(6), { id: "mob-thu", dow: 4, name: "Spine and sides", subtitle: "Twist, plank, breath", minutes: 16, why: "Core as control, not a crunch marathon." }),
    cloneDay(dAt(0), { id: "mob-fri", dow: 5, name: "Easy press", subtitle: "Short push, stretch", minutes: 16, why: "A little press so the pattern stays, then length." }),
    cloneDay(dAt(6), { id: "mob-sat", name: "Recover", subtitle: "Mobility, easy legs, breathing", minutes: 16, why: "Open the joints, breathe. No grinding." })
  ];

  const capacityDays = [
    cloneDay(dAt(0), { id: "cap-sun", name: "Sunday Pulse", subtitle: "Short · keep moving", minutes: 12, why: "Twelve minutes. Stay warm. Then Word and out the door." }),
    cloneDay(dAt(1), { id: "cap-mon", name: "Core density", subtitle: "Abs plus climbers", minutes: 24, why: "The trunk circuit, kept honest and moving." }),
    cloneDay(dAt(5), { id: "cap-tue", dow: 2, name: "Upper density", subtitle: "Burpees, press, back", minutes: 26, why: "A denser upper mix. Still bodyweight, still home." }),
    cloneDay(dAt(3), { id: "cap-wed", name: "Lower density", subtitle: "Squat, lunge, hinge", minutes: 28, why: "Lower body with enough work to feel the week." }),
    cloneDay(dAt(4), { id: "cap-thu", name: "Core control", subtitle: "Hollow, sides, plank", minutes: 22, why: "Second core day, cleaner finish." }),
    cloneDay(dAt(5), { id: "cap-fri", name: "Full mix", subtitle: "Shoulders, back, snap", minutes: 26, why: "Close the work week with the upper mix." }),
    cloneDay(dAt(6), { id: "cap-sat", name: "Recover", subtitle: "Mobility, easy legs, breathing", minutes: 16, why: "Open the joints. Sunday can stay short." })
  ];

  const plans = [
    { id: "energy", name: "Stay ready", goal: "Energy and balance", blurb: "The ALIGN week: push, pull, legs, core, recover. Sunday stays short." },
    { id: "strength", name: "Get stronger", goal: "Strength", blurb: "Heavier push, pull, and legs. Still bodyweight. Sunday still short." },
    { id: "mobility", name: "Move easier", goal: "Mobility", blurb: "Joints, breath, light work. You still open the app every day." },
    { id: "capacity", name: "Stay sharp", goal: "Work capacity", blurb: "Denser sessions, same floor. Recover Saturday, short Sunday." }
  ];
  const weeks = { energy: days, strength: strengthDays, mobility: mobilityDays, capacity: capacityDays };
  const weekFor = (id) => weeks[id] || days;
  const allDays = () => days.concat(strengthDays, mobilityDays, capacityDays);

  const insights = {
    old: { push: 72, pull: 12, legs: 4, core: 28, mobility: 18 },
    neu: { push: 28, pull: 22, legs: 24, core: 22, mobility: 18 },
    findings: [
      {
        title: "Push is a day, not the week",
        body: "Sunday is a twelve-minute press. Friday carries the full upper mix. The other days train something else, so shoulders last."
      },
      {
        title: "Legs get a real session",
        body: "Wednesday is lower body: squats, lunges, hinges, calves. Saturday keeps a light dose so the pattern sticks."
      },
      {
        title: "Pull keeps the shoulders honest",
        body: "Floor back work plus rows. Without a pull, all that pressing drifts the posture forward."
      },
      {
        title: "Core trains more than crunching",
        body: "Monday and Thursday stay serious. Dead bugs, hollow, and side work so the spine is trained in more than one direction."
      }
    ]
  };

  /* Free YouTube how-tos — play in-app. Short form demos, not workouts. */
  const YT = {
    "jumping-jacks": "F_rq04M0x5M",
    "arm-circles": "hne3nHGXPRM",
    "inchworms": "D6rkvz2cnKs",
    "burpees": "dZgVxmf6jkA",
    "push-ups": "IODxDxX7oi4",
    "knee-push-ups": "1nAsgpufzhc",
    "diamond-push-ups": "jaxbEHLC4qU",
    "wide-arm-push-ups": "L-JD0xyXh74",
    "staggered-push-ups": "L-JD0xyXh74",
    "decline-push-ups": "L-JD0xyXh74",
    "hindu-push-ups": "mvNcSF-nXg4",
    "spiderman-push-ups": "t-NQ_xHHeVk",
    "pike-push-ups": "XckEEwa1BPI",
    "reverse-push-ups": "mvNcSF-nXg4",
    "hover-push-up": "Ng-iiDUd_fs",
    "supine-push-up": "Mz2pZdK_U5g",
    "floor-tricep-dips": "KJk2oeaMNA4",
    "push-up-rotation": "E2JCx1pzX0U",
    "back-bow-pulls": "zF0eyYXbG20",
    "floor-y-raises": "X1yMJldLGIo",
    "reverse-snow-angels": "X1yMJldLGIo",
    "hyperextension": "zF0eyYXbG20",
    "superman-hold": "44ScXWFaVBs",
    "prone-t-raises": "X1yMJldLGIo",
    "bird-dog": "wiFNA3sqjCA",
    "towel-rows": "SwaQJctxcGk",
    "squats": "DlS-GAF8Edg",
    "sumo-squats": "DlS-GAF8Edg",
    "reverse-lunges": "94AXT7D3bKY",
    "glute-bridge": "Mz2pZdK_U5g",
    "sl-glute-bridge": "c6UXqFii7NA",
    "wall-sit": "JaZNYM3zAP0",
    "calf-raises": "Mz2pZdK_U5g",
    "donkey-kicks": "DtSfBsdIlJo",
    "good-mornings": "61zbhuRiwQg",
    "standing-kickbacks": "DtSfBsdIlJo",
    "fire-hydrants": "DtSfBsdIlJo",
    "sit-ups": "1fbU_MkV7NE",
    "crunches-raised": "1fbU_MkV7NE",
    "bicycle-crunches": "VaL7XWK3MVE",
    "russian-twist": "wkD8rjkodUI",
    "mountain-climber": "PaR6Z7D5fl4",
    "leg-raises": "l4kQd9eWclE",
    "crossover-crunch": "VaL7XWK3MVE",
    "v-up": "LPsepk-C-d4",
    "plank": "pSHjTRCQxIw",
    "side-plank": "PtqBJhdxqPI",
    "side-bridges": "DXQ9YKHtcsk",
    "dead-bug": "XcYtWYMz39w",
    "hollow-hold": "44ScXWFaVBs",
    "reclined-oblique": "wkD8rjkodUI",
    "shoulder-stretch": "B9uY01NoqBg",
    "cobra-stretch": "n6jrC6WeF84",
    "chest-stretch": "B9uY01NoqBg",
    "cat-cow": "y39PrKY_4JM",
    "childs-pose": "3ccamYgDXHI",
    "side-lying-stretch": "uRRwljV-Nlk",
    "lumbar-twist": "y39PrKY_4JM",
    "hip-flexor": "tsGPYSQbZx4",
    "forward-fold": "goN4rWbQUn4",
    "quad-stretch": "Td-9CSgSFhs",
    "worlds-greatest": "w4n6iZeYS9w",
    "down-dog": "j97SSGsnCAQ",
    "hamstring-stretch": "goN4rWbQUn4",
    "breathing": "u0th_ktl1UI"
  };
  Object.keys(YT).forEach((id) => {
    if (exercises[id]) exercises[id].yt = YT[id];
  });

  const restAfter = (ex) => {
    if (ex.pattern === "mobility") return 8;
    if (ex.pattern === "warmup") return 10;
    if (ex.kind === "time") return 12;
    return 15;
  };

  return { exercises, days, insights, restAfter, plans, weekFor, allDays };
})();
