/* ALIGN Scripture — memory verses + 2-minute sprint, spaced repetition.
   Texts: World English Bible (public domain), matching in-app reading. */
window.ALIGN_SCRIPTURE = (() => {
  const LS = "align-scripture";
  const DAY_MS = 86400000;
  const SPRINT_SEC = 120;
  const SPRINT_N = 60;

  const V = (id, book, chapter, verse, thru, text, theme, why, score) =>
    ({ id, book, chapter, verse, thru: thru || verse, text, theme, why, score });

  /* Curated for spiritual growth: Word hidden in the heart, trust, holiness,
     gospel, prayer, identity in Christ, the Spirit. Prefer the famous line
     or the bottom line of the chapter when several could fit. */
  const VERSES = [
    V("ge1-1", "Genesis", 1, 1, 1, "In the beginning, God created the heavens and the earth.", "God", "The first sentence of Scripture. Everything else hangs on this.", 5),
    V("ge1-27", "Genesis", 1, 27, 27, "God created man in his own image. In God's image he created him; male and female he created them.", "Identity", "You are not an accident. Image-bearing is the ground of dignity.", 5),
    V("ge12-2", "Genesis", 12, 2, 3, "I will make of you a great nation. I will bless you and make your name great. You will be a blessing.", "Promise", "The call of Abraham: blessed to bless.", 4),
    V("ge15-6", "Genesis", 15, 6, 6, "He believed in Yahweh, who credited it to him for righteousness.", "Faith", "Faith counted as righteousness — the gospel in Genesis.", 5),
    V("ge50-20", "Genesis", 50, 20, 20, "As for you, you meant evil against me, but God meant it for good, to save many people alive, as is happening today.", "Providence", "Bottom line of Joseph: God is larger than what was meant for harm.", 5),
    V("ex3-14", "Exodus", 3, 14, 14, "God said to Moses, \"I AM WHO I AM,\" and he said, \"You shall tell the children of Israel this: 'I AM has sent me to you.'\"", "God", "The name that holds the bush and the people.", 5),
    V("ex14-14", "Exodus", 14, 14, 14, "Yahweh will fight for you, and you shall be still.", "Trust", "When the sea is ahead and Egypt behind: stand still.", 5),
    V("ex20-3", "Exodus", 20, 3, 3, "You shall have no other gods before me.", "Holiness", "The first word of the Ten. Spiritual life starts here.", 5),
    V("ex33-14", "Exodus", 33, 14, 14, "He said, \"My presence will go with you, and I will give you rest.\"", "Presence", "Better than the land: God himself going with you.", 4),
    V("ex34-6", "Exodus", 34, 6, 7, "Yahweh, a merciful and gracious God, slow to anger, and abundant in loving kindness and truth, keeping loving kindness for thousands, forgiving iniquity and disobedience and sin.", "God", "The confession God makes about himself.", 5),
    V("nu6-24", "Numbers", 6, 24, 26, "Yahweh bless you, and keep you. Yahweh make his face to shine on you, and be gracious to you. Yahweh lift up his face toward you, and give you peace.", "Blessing", "The priestly blessing. Carry it.", 5),
    V("dt6-4", "Deuteronomy", 6, 4, 5, "Hear, Israel: Yahweh is our God. Yahweh is one. You shall love Yahweh your God with all your heart, with all your soul, and with all your might.", "Love", "The Shema. Jesus names this the first command.", 5),
    V("dt8-3", "Deuteronomy", 8, 3, 3, "Man does not live by bread only, but man lives by every word that proceeds out of Yahweh's mouth.", "The Word", "Jesus quotes this in the wilderness. So should we.", 5),
    V("dt31-6", "Deuteronomy", 31, 6, 6, "Be strong and courageous. Don't be afraid, nor be scared of them, for Yahweh your God himself is who goes with you. He will not fail you nor forsake you.", "Courage", "Presence, not personality, is the ground of courage.", 5),
    V("jos1-8", "Joshua", 1, 8, 8, "This book of the law shall not depart from your mouth, but you shall meditate on it day and night, that you may observe to do according to all that is written in it; for then you shall make your way prosperous, and then you shall have good success.", "The Word", "How a life is built: mouth, mind, obedience.", 5),
    V("jos1-9", "Joshua", 1, 9, 9, "Haven't I commanded you? Be strong and courageous. Don't be afraid. Don't be dismayed, for Yahweh your God is with you wherever you go.", "Courage", "The verse most people hide when a new land opens.", 5),
    V("jos24-15", "Joshua", 24, 15, 15, "As for me and my house, we will serve Yahweh.", "Devotion", "A household decision, said out loud.", 4),
    V("ru1-16", "Ruth", 1, 16, 16, "Don't urge me to leave you, and to return from following you, for where you go, I will go; and where you stay, I will stay. Your people will be my people, and your God my God.", "Loyalty", "Covenant love in one sentence.", 4),
    V("1sa16-7", "1 Samuel", 16, 7, 7, "Yahweh said to Samuel, \"Don't look on his face, or on the height of his stature, because I have rejected him; for I don't see as man sees. For man looks at the outward appearance, but Yahweh looks at the heart.\"", "Heart", "The Lord reads what people miss.", 5),
    V("1sa15-22", "1 Samuel", 15, 22, 22, "Behold, to obey is better than sacrifice, and to listen than the fat of rams.", "Obedience", "Religion without obedience is noise.", 4),
    V("2sa22-31", "2 Samuel", 22, 31, 31, "As for God, his way is perfect. Yahweh's word is tested. He is a shield to all those who take refuge in him.", "The Word", "Tried Word. Safe refuge.", 4),
    V("1ki8-27", "1 Kings", 8, 27, 27, "But will God in very deed dwell on the earth? Behold, heaven and the heaven of heavens can't contain you; how much less this house that I have built!", "God", "Solomon's bottom line: God is larger than the temple.", 4),
    V("1ki19-12", "1 Kings", 19, 12, 12, "After the earthquake a fire, but Yahweh was not in the fire; and after the fire a still small voice.", "Presence", "He is often in the quiet, not the spectacle.", 4),
    V("1ch16-11", "1 Chronicles", 16, 11, 11, "Seek Yahweh and his strength. Seek his face forever more.", "Prayer", "A short rule for a long life.", 4),
    V("2ch7-14", "2 Chronicles", 7, 14, 14, "If my people, who are called by my name, will humble themselves, pray, seek my face, and turn from their wicked ways, then I will hear from heaven, will forgive their sin, and will heal their land.", "Repentance", "The classic call back.", 5),
    V("neh8-10", "Nehemiah", 8, 10, 10, "Don't be grieved, for the joy of Yahweh is your strength.", "Joy", "The Word read aloud, then joy as strength.", 4),
    V("est4-14", "Esther", 4, 14, 14, "Who knows if you haven't come to the kingdom for such a time as this?", "Calling", "Courage timed by providence.", 4),
    V("job1-21", "Job", 1, 21, 21, "Yahweh gave, and Yahweh has taken away. Blessed be Yahweh's name.", "Worship", "Worship that survives loss.", 4),
    V("job19-25", "Job", 19, 25, 25, "But as for me, I know that my Redeemer lives. In the end, he will stand upon the earth.", "Hope", "The bottom line under the ash heap.", 5),
    V("job23-12", "Job", 23, 12, 12, "I haven't gone back from the commandment of his lips. I have treasured up the words of his mouth more than my necessary food.", "The Word", "Hunger for the Word over bread.", 5),
    V("ps1-2", "Psalm", 1, 2, 3, "But his delight is in Yahweh's law. On his law he meditates day and night. He will be like a tree planted by the streams of water, that produces its fruit in its season.", "The Word", "The blessed life is a rooted life.", 5),
    V("ps19-14", "Psalm", 19, 14, 14, "Let the words of my mouth and the meditation of my heart be acceptable in your sight, Yahweh, my rock, and my redeemer.", "Prayer", "A daily gate over speech and thought.", 5),
    V("ps23-1", "Psalm", 23, 1, 1, "Yahweh is my shepherd: I shall lack nothing.", "Trust", "The most hidden psalm in the world, for a reason.", 5),
    V("ps23-4", "Psalm", 23, 4, 4, "Even though I walk through the valley of the shadow of death, I will fear no evil, for you are with me. Your rod and your staff, they comfort me.", "Courage", "Presence in the valley, not a detour around it.", 5),
    V("ps27-1", "Psalm", 27, 1, 1, "Yahweh is my light and my salvation. Whom shall I fear? Yahweh is the strength of my life. Of whom shall I be afraid?", "Courage", "Fear loses its question when God is light.", 5),
    V("ps34-8", "Psalm", 34, 8, 8, "Oh taste and see that Yahweh is good. Blessed is the man who takes refuge in him.", "Trust", "Faith is not theory. Taste.", 4),
    V("ps37-4", "Psalm", 37, 4, 4, "Also delight yourself in Yahweh, and he will give you the desires of your heart.", "Desire", "Delight first. Desire follows.", 4),
    V("ps46-1", "Psalm", 46, 1, 1, "God is our refuge and strength, a very present help in trouble.", "Trust", "Help that is present, not postponed.", 5),
    V("ps46-10", "Psalm", 46, 10, 10, "Be still, and know that I am God. I will be exalted among the nations. I will be exalted in the earth.", "Presence", "Stillness as knowledge of God.", 5),
    V("ps51-10", "Psalm", 51, 10, 10, "Create in me a clean heart, O God. Renew a right spirit within me.", "Holiness", "The prayer after failure.", 5),
    V("ps103-2", "Psalm", 103, 2, 2, "Praise Yahweh, my soul, and don't forget all his benefits.", "Thanksgiving", "Memory is worship.", 4),
    V("ps119-11", "Psalm", 119, 11, 11, "I have hidden your word in my heart, that I might not sin against you.", "The Word", "The verse that names this tutor.", 5),
    V("ps119-105", "Psalm", 119, 105, 105, "Your word is a lamp to my feet, and a light for my path.", "The Word", "Not a floodlight for the year. Light for the next step.", 5),
    V("ps121-2", "Psalm", 121, 2, 2, "My help comes from Yahweh, who made heaven and earth.", "Trust", "Help has an address.", 4),
    V("ps139-14", "Psalm", 139, 14, 14, "I will give thanks to you, for I am fearfully and wonderfully made. Your works are wonderful. My soul knows that very well.", "Identity", "Wonder, not self-hate, is the psalm's bottom line.", 4),
    V("pr3-5", "Proverbs", 3, 5, 6, "Trust in Yahweh with all your heart, and don't lean on your own understanding. In all your ways acknowledge him, and he will make your paths straight.", "Trust", "The discipleship proverb. Whole heart. Straight path.", 5),
    V("pr4-23", "Proverbs", 4, 23, 23, "Keep your heart with all diligence, for out of it is the wellspring of life.", "Heart", "Guard the spring or the whole stream turns.", 5),
    V("pr9-10", "Proverbs", 9, 10, 10, "The fear of Yahweh is the beginning of wisdom. The knowledge of the Holy One is understanding.", "Wisdom", "Wisdom does not start with IQ. It starts with God.", 5),
    V("pr16-3", "Proverbs", 16, 3, 3, "Commit your deeds to Yahweh, and your plans shall succeed.", "Work", "Commit first. Then the plans.", 4),
    V("pr18-10", "Proverbs", 18, 10, 10, "Yahweh's name is a strong tower: the righteous run to him, and are safe.", "Trust", "A place to run, not a slogan.", 4),
    V("pr22-6", "Proverbs", 22, 6, 6, "Train up a child in the way he should go, and when he is old he will not depart from it.", "Wisdom", "Formation early, direction late.", 3),
    V("ecc12-13", "Ecclesiastes", 12, 13, 13, "This is the end of the matter. All has been heard. Fear God and keep his commandments; for this is the whole duty of man.", "Wisdom", "The Preacher's bottom line.", 5),
    V("isa9-6", "Isaiah", 9, 6, 6, "For a child is born to us. A son is given to us; and the government will be on his shoulders. His name will be called Wonderful Counselor, Mighty God, Everlasting Father, Prince of Peace.", "Christ", "The child who carries the government.", 5),
    V("isa26-3", "Isaiah", 26, 3, 3, "You will keep whoever's mind is steadfast in perfect peace, because he trusts in you.", "Peace", "Steadfast mind. Perfect peace. Trust is the hinge.", 5),
    V("isa40-31", "Isaiah", 40, 31, 31, "But those who wait for Yahweh will renew their strength. They will mount up with wings like eagles. They will run, and not be weary. They will walk, and not faint.", "Hope", "Waiting is not wasting. Strength is exchanged.", 5),
    V("isa41-10", "Isaiah", 41, 10, 10, "Don't you be afraid, for I am with you. Don't be dismayed, for I am your God. I will strengthen you. Yes, I will help you. Yes, I will uphold you with the right hand of my righteousness.", "Courage", "Four promises against fear.", 5),
    V("isa53-5", "Isaiah", 53, 5, 5, "But he was pierced for our transgressions. He was crushed for our iniquities. The punishment that brought our peace was on him; and by his wounds we are healed.", "Gospel", "The servant's work, in one verse.", 5),
    V("isa55-6", "Isaiah", 55, 6, 6, "Seek Yahweh while he may be found. Call on him while he is near.", "Prayer", "Nearness has a season. Call now.", 4),
    V("jer17-9", "Jeremiah", 17, 9, 9, "The heart is deceitful above all things and it is exceedingly corrupt. Who can know it?", "Heart", "Why we need a new heart, not a better mood.", 4),
    V("jer29-11", "Jeremiah", 29, 11, 11, "For I know the thoughts that I think toward you, says Yahweh, thoughts of peace, and not of evil, to give you hope and a future.", "Hope", "Spoken to exiles. Hope with a future attached.", 5),
    V("jer33-3", "Jeremiah", 33, 3, 3, "Call to me, and I will answer you, and will show you great and difficult things, which you don't know.", "Prayer", "Prayer as invitation into what you do not know.", 4),
    V("lam3-22", "Lamentations", 3, 22, 23, "It is because of Yahweh's loving kindnesses that we are not consumed, because his mercies don't fail. They are new every morning. Great is your faithfulness.", "Mercy", "Morning mercies. The reason you rose.", 5),
    V("eze36-26", "Ezekiel", 36, 26, 26, "I will also give you a new heart, and I will put a new spirit within you. I will take away the stony heart out of your flesh, and I will give you a heart of flesh.", "Holiness", "God does not polish the old heart. He replaces it.", 5),
    V("dan6-10", "Daniel", 6, 10, 10, "When Daniel knew that the writing was signed, he went into his house (now his windows were open in his room toward Jerusalem) and he kneeled on his knees three times a day, and prayed, and gave thanks before his God, as he did before.", "Prayer", "The habit that the lions could not break.", 4),
    V("hos6-6", "Hosea", 6, 6, 6, "For I desire mercy, and not sacrifice; and the knowledge of God more than burnt offerings.", "Devotion", "What God actually wants.", 4),
    V("joel2-13", "Joel", 2, 13, 13, "Tear your heart, and not your garments, and turn to Yahweh, your God; for he is gracious and merciful, slow to anger, and abundant in loving kindness, and relents from sending calamity.", "Repentance", "Rend the heart, not the costume.", 4),
    V("am5-24", "Amos", 5, 24, 24, "But let justice roll on like rivers, and righteousness like a mighty stream.", "Justice", "The prophet's bottom line.", 4),
    V("mic6-8", "Micah", 6, 8, 8, "He has shown you, O man, what is good. What does Yahweh require of you, but to act justly, to love mercy, and to walk humbly with your God?", "Holiness", "The whole of a walked life, in three verbs.", 5),
    V("hab2-4", "Habakkuk", 2, 4, 4, "Behold, his soul is puffed up. It is not upright in him, but the righteous will live by his faith.", "Faith", "Paul's gospel text, first spoken here.", 5),
    V("hab3-17", "Habakkuk", 3, 17, 18, "For though the fig tree doesn't flourish, nor fruit be in the vines… yet I will rejoice in Yahweh. I will be joyful in the God of my salvation.", "Joy", "Joy that does not wait on the harvest.", 4),
    V("zep3-17", "Zephaniah", 3, 17, 17, "Yahweh, your God, is among you, a mighty one who will save. He will rejoice over you with joy. He will calm you in his love. He will rejoice over you with singing.", "Love", "God singing over his people.", 5),
    V("mal3-10", "Malachi", 3, 10, 10, "Bring the whole tithe into the storehouse, that there may be food in my house, and test me now in this, says Yahweh of Armies, if I will not open you the windows of heaven, and pour you out a blessing, that there will not be room enough for.", "Trust", "The rare invitation to test God.", 3),
    V("mt4-4", "Matthew", 4, 4, 4, "But he answered, \"It is written, 'Man shall not live by bread alone, but by every word that proceeds out of God's mouth.'\"", "The Word", "Jesus fights with memorized Scripture. So can you.", 5),
    V("mt5-16", "Matthew", 5, 16, 16, "Even so, let your light shine before men, that they may see your good works and glorify your Father who is in heaven.", "Witness", "Shine so they see the Father, not you.", 4),
    V("mt6-33", "Matthew", 6, 33, 33, "But seek first God's Kingdom and his righteousness; and all these things will be given to you as well.", "Priority", "First things first. The rest follows.", 5),
    V("mt7-7", "Matthew", 7, 7, 7, "Ask, and it will be given you. Seek, and you will find. Knock, and it will be opened for you.", "Prayer", "Three verbs. Keep going.", 4),
    V("mt11-28", "Matthew", 11, 28, 28, "Come to me, all you who labor and are heavily burdened, and I will give you rest.", "Rest", "The invitation under every tired morning.", 5),
    V("mt22-37", "Matthew", 22, 37, 39, "You shall love the Lord your God with all your heart, with all your soul, and with all your mind. This is the first and great commandment. A second likewise is this, 'You shall love your neighbor as yourself.'", "Love", "The whole law, hung on two hooks.", 5),
    V("mt28-19", "Matthew", 28, 19, 20, "Go and make disciples of all nations, baptizing them in the name of the Father and of the Son and of the Holy Spirit, teaching them to observe all things that I commanded you. Behold, I am with you always, even to the end of the age.", "Mission", "Go. I am with you. Always.", 5),
    V("mk8-34", "Mark", 8, 34, 34, "If anyone wants to come after me, let him deny himself, take up his cross, and follow me.", "Discipleship", "The cost, said plainly.", 5),
    V("mk12-30", "Mark", 12, 30, 30, "You shall love the Lord your God with all your heart, with all your soul, with all your mind, and with all your strength.", "Love", "Four 'alls'. None left over.", 5),
    V("lk4-18", "Luke", 4, 18, 19, "The Spirit of the Lord is on me, because he has anointed me to preach good news to the poor.", "Mission", "Jesus' own mission statement.", 4),
    V("lk9-23", "Luke", 9, 23, 23, "If anyone desires to come after me, let him deny himself, take up his cross, and follow me.", "Discipleship", "Daily cross. Not a metaphor you visit.", 4),
    V("lk11-9", "Luke", 11, 9, 9, "I tell you, keep asking, and it will be given you. Keep seeking, and you will find. Keep knocking, and it will be opened to you.", "Prayer", "Keep. The verb is the point.", 4),
    V("jn1-1", "John", 1, 1, 1, "In the beginning was the Word, and the Word was with God, and the Word was God.", "Christ", "John's Genesis.", 5),
    V("jn1-12", "John", 1, 12, 12, "But as many as received him, to them he gave the right to become God's children, to those who believe in his name.", "Gospel", "Received. Believed. Children.", 5),
    V("jn3-16", "John", 3, 16, 16, "For God so loved the world, that he gave his one and only Son, that whoever believes in him should not perish, but have eternal life.", "Gospel", "The most believed line in the book. Hide it anyway.", 5),
    V("jn8-32", "John", 8, 32, 32, "You will know the truth, and the truth will make you free.", "Freedom", "Truth first. Freedom follows.", 4),
    V("jn10-10", "John", 10, 10, 10, "The thief only comes to steal, kill, and destroy. I came that they may have life, and may have it abundantly.", "Life", "Abundant life has a name, not a vibe.", 5),
    V("jn14-6", "John", 14, 6, 6, "Jesus said to him, \"I am the way, the truth, and the life. No one comes to the Father, except through me.\"", "Christ", "The exclusive claim that saves.", 5),
    V("jn14-27", "John", 14, 27, 27, "Peace I leave with you. My peace I give to you; not as the world gives, I give to you. Don't let your heart be troubled, neither let it be fearful.", "Peace", "His peace, not the world's version.", 5),
    V("jn15-5", "John", 15, 5, 5, "I am the vine. You are the branches. He who remains in me and I in him bears much fruit, for apart from me you can do nothing.", "Abide", "Fruit is remaining, not straining.", 5),
    V("jn16-33", "John", 16, 33, 33, "I have told you these things, that in me you may have peace. In the world you have trouble; but cheer up! I have overcome the world.", "Peace", "Trouble is promised. So is overcoming.", 5),
    V("ac1-8", "Acts", 1, 8, 8, "But you will receive power when the Holy Spirit has come upon you. You will be witnesses to me in Jerusalem, in all Judea and Samaria, and to the uttermost parts of the earth.", "Spirit", "Power for witness, not for display.", 5),
    V("ac4-12", "Acts", 4, 12, 12, "There is salvation in no one else, for there is no other name under heaven that is given among men, by which we must be saved!", "Gospel", "One name. No other.", 5),
    V("ac16-31", "Acts", 16, 31, 31, "They said, \"Believe in the Lord Jesus Christ, and you will be saved, you and your household.\"", "Gospel", "The jailer's verse.", 4),
    V("ro1-16", "Romans", 1, 16, 16, "For I am not ashamed of the Good News of Christ, because it is the power of God for salvation for everyone who believes, for the Jew first, and also for the Greek.", "Gospel", "Power, not embarrassment.", 5),
    V("ro3-23", "Romans", 3, 23, 23, "For all have sinned, and fall short of the glory of God.", "Gospel", "The diagnosis. Don't skip it.", 5),
    V("ro5-8", "Romans", 5, 8, 8, "But God commends his own love toward us, in that while we were yet sinners, Christ died for us.", "Love", "Loved at our worst, not after we cleaned up.", 5),
    V("ro6-23", "Romans", 6, 23, 23, "For the wages of sin is death, but the free gift of God is eternal life in Christ Jesus our Lord.", "Gospel", "Wages versus gift.", 5),
    V("ro8-1", "Romans", 8, 1, 1, "There is therefore now no condemnation to those who are in Christ Jesus, who don't walk according to the flesh, but according to the Spirit.", "Identity", "No condemnation. Now.", 5),
    V("ro8-28", "Romans", 8, 28, 28, "We know that all things work together for good for those who love God, for those who are called according to his purpose.", "Providence", "All things. For good. For the called.", 5),
    V("ro8-38", "Romans", 8, 38, 39, "For I am persuaded that neither death, nor life, nor angels, nor principalities, nor things present, nor things to come, nor powers, nor height, nor depth, nor any other created thing will be able to separate us from God's love which is in Christ Jesus our Lord.", "Love", "Nothing. Not one created thing.", 5),
    V("ro10-9", "Romans", 10, 9, 9, "If you will confess with your mouth that Jesus is Lord, and believe in your heart that God raised him from the dead, you will be saved.", "Gospel", "Mouth and heart. Lord and risen.", 5),
    V("ro12-1", "Romans", 12, 1, 2, "Therefore I urge you, brothers, by the mercies of God, to present your bodies a living sacrifice, holy, acceptable to God, which is your spiritual service. Don't be conformed to this world, but be transformed by the renewing of your mind.", "Holiness", "Living sacrifice. Renewed mind. Not conformed.", 5),
    V("1co6-19", "1 Corinthians", 6, 19, 20, "Or don't you know that your body is a temple of the Holy Spirit who is in you, whom you have from God? You are not your own, for you were bought with a price. Therefore glorify God in your body and in your spirit, which are God's.", "Holiness", "The body is not a side issue.", 5),
    V("1co10-13", "1 Corinthians", 10, 13, 13, "No temptation has taken you except what is common to man. God is faithful, who will not allow you to be tempted above what you are able, but will with the temptation also make the way of escape, that you may be able to endure it.", "Holiness", "Faithful God. A way out. Endure.", 5),
    V("1co10-31", "1 Corinthians", 10, 31, 31, "Whether therefore you eat or drink, or whatever you do, do all to the glory of God.", "Work", "All of it, to his glory.", 4),
    V("1co13-4", "1 Corinthians", 13, 4, 7, "Love is patient and is kind. Love doesn't envy. Love doesn't brag, is not proud, doesn't behave itself inappropriately, doesn't seek its own way, is not provoked, takes no account of evil; doesn't rejoice in unrighteousness, but rejoices with the truth; bears all things, believes all things, hopes all things, and endures all things.", "Love", "What love actually is, when feelings lie.", 5),
    V("1co15-58", "1 Corinthians", 15, 58, 58, "Therefore, my beloved brothers, be steadfast, immovable, always abounding in the Lord's work, because you know that your labor is not in vain in the Lord.", "Hope", "Resurrection makes work not vain.", 4),
    V("2co5-17", "2 Corinthians", 5, 17, 17, "Therefore if anyone is in Christ, he is a new creation. The old things have passed away. Behold, all things have become new.", "Identity", "New, not improved.", 5),
    V("2co5-21", "2 Corinthians", 5, 21, 21, "For him who knew no sin he made to be sin on our behalf, so that in him we might become the righteousness of God.", "Gospel", "The great exchange.", 5),
    V("2co12-9", "2 Corinthians", 12, 9, 9, "He has said to me, \"My grace is sufficient for you, for my power is made perfect in weakness.\" Most gladly therefore I will rather glory in my weaknesses, that the power of Christ may rest on me.", "Grace", "Strength shows up in the weak place.", 5),
    V("ga2-20", "Galatians", 2, 20, 20, "I have been crucified with Christ, and it is no longer I who live, but Christ lives in me. That life which I now live in the flesh, I live by faith in the Son of God, who loved me, and gave himself up for me.", "Identity", "The old self, ended. Christ, in you.", 5),
    V("ga5-16", "Galatians", 5, 16, 16, "But I say, walk by the Spirit, and you won't fulfill the lust of the flesh.", "Spirit", "Walk. Not a feeling — a path.", 5),
    V("ga5-22", "Galatians", 5, 22, 23, "But the fruit of the Spirit is love, joy, peace, patience, kindness, goodness, faith, gentleness, and self-control. Against such things there is no law.", "Spirit", "Nine names for a changed life.", 5),
    V("ga6-9", "Galatians", 6, 9, 9, "Let's not be weary in doing good, for we will reap in due season if we don't give up.", "Hope", "Due season. Don't quit.", 4),
    V("eph2-8", "Ephesians", 2, 8, 9, "For by grace you have been saved through faith, and that not of yourselves; it is the gift of God, not of works, that no one would boast.", "Gospel", "Gift, not wage.", 5),
    V("eph2-10", "Ephesians", 2, 10, 10, "For we are his workmanship, created in Christ Jesus for good works, which God prepared before that we would walk in them.", "Calling", "Saved for a walk already prepared.", 5),
    V("eph3-20", "Ephesians", 3, 20, 20, "Now to him who is able to do exceedingly abundantly above all that we ask or think, according to the power that works in us.", "Prayer", "Ask. He is still above it.", 4),
    V("eph4-32", "Ephesians", 4, 32, 32, "And be kind to one another, tender hearted, forgiving each other, just as God also in Christ forgave you.", "Love", "Forgive as forgiven.", 4),
    V("eph6-10", "Ephesians", 6, 10, 11, "Finally, be strong in the Lord, and in the strength of his might. Put on the whole armor of God, that you may be able to stand against the wiles of the devil.", "Warfare", "His might. Whole armor. Stand.", 5),
    V("php1-6", "Philippians", 1, 6, 6, "Being confident of this very thing, that he who began a good work in you will complete it until the day of Jesus Christ.", "Hope", "He finishes what he starts.", 5),
    V("php2-3", "Philippians", 2, 3, 4, "Doing nothing through rivalry or through conceit, but in humility, each counting others better than himself; each of you not just looking to his own things, but each of you also to the things of others.", "Humility", "The mind of Christ, in traffic.", 4),
    V("php4-6", "Philippians", 4, 6, 7, "In nothing be anxious, but in everything, by prayer and petition with thanksgiving, let your requests be made known to God. And the peace of God, which surpasses all understanding, will guard your hearts and your thoughts in Christ Jesus.", "Peace", "Pray it out. Peace stands guard.", 5),
    V("php4-8", "Philippians", 4, 8, 8, "Finally, brothers, whatever things are true, whatever things are honorable, whatever things are just, whatever things are pure, whatever things are lovely, whatever things are of good report: if there is any virtue, and if there is any praise, think about these things.", "Mind", "A filter for the inner life.", 5),
    V("php4-13", "Philippians", 4, 13, 13, "I can do all things through Christ, who strengthens me.", "Strength", "Contentment-strength, not slogan-strength.", 5),
    V("col3-2", "Colossians", 3, 2, 2, "Set your mind on the things that are above, not on the things that are on the earth.", "Mind", "Aim the mind or the earth will.", 4),
    V("col3-16", "Colossians", 3, 16, 16, "Let the word of Christ dwell in you richly; in all wisdom teaching and admonishing one another with psalms, hymns, and spiritual songs, singing with grace in your heart to the Lord.", "The Word", "Dwell richly — this tutor's aim.", 5),
    V("col3-23", "Colossians", 3, 23, 23, "And whatever you do, work heartily, as for the Lord, and not for men.", "Work", "The true audience of your work.", 4),
    V("1th5-16", "1 Thessalonians", 5, 16, 18, "Always rejoice. Pray without ceasing. In everything give thanks, for this is the will of God in Christ Jesus toward you.", "Prayer", "Three marks of a will-of-God life.", 5),
    V("2th3-3", "2 Thessalonians", 3, 3, 3, "But the Lord is faithful, who will establish you and guard you from the evil one.", "Trust", "Faithful Lord. Guarded people.", 3),
    V("1ti4-12", "1 Timothy", 4, 12, 12, "Let no man despise your youth; but be an example to those who believe, in word, in your way of life, in love, in spirit, in faith, and in purity.", "Holiness", "Example, not excuse.", 4),
    V("2ti1-7", "2 Timothy", 1, 7, 7, "For God didn't give us a spirit of fear, but of power, love, and self-control.", "Spirit", "Not fear. Power, love, a sound mind.", 5),
    V("2ti2-15", "2 Timothy", 2, 15, 15, "Do your best to present yourself approved by God, a workman who doesn't need to be ashamed, properly handling the Word of Truth.", "The Word", "Handle the Word. Don't twist it.", 5),
    V("2ti3-16", "2 Timothy", 3, 16, 17, "Every Scripture is God-breathed and profitable for teaching, for reproof, for correction, and for instruction in righteousness, that each person who belongs to God may be complete, thoroughly equipped for every good work.", "The Word", "Why we read. Why we hide it.", 5),
    V("tt2-11", "Titus", 2, 11, 12, "For the grace of God has appeared, bringing salvation to all men, instructing us to the intent that, denying ungodliness and worldly lusts, we would live soberly, righteously, and godly in this present age.", "Grace", "Grace trains. It does not spoil.", 4),
    V("heb4-12", "Hebrews", 4, 12, 12, "For the word of God is living and active, and sharper than any two-edged sword, piercing even to the dividing of soul and spirit, of both joints and marrow, and is able to discern the thoughts and intentions of the heart.", "The Word", "Alive. It reads you back.", 5),
    V("heb4-16", "Hebrews", 4, 16, 16, "Let's therefore draw near with boldness to the throne of grace, that we may receive mercy and may find grace for help in time of need.", "Prayer", "Bold, because it is a throne of grace.", 5),
    V("heb11-1", "Hebrews", 11, 1, 1, "Now faith is assurance of things hoped for, proof of things not seen.", "Faith", "The definition the chapter then lives.", 5),
    V("heb12-1", "Hebrews", 12, 1, 2, "Therefore let's also, seeing we are surrounded by so great a cloud of witnesses, lay aside every weight and the sin which so easily entangles us, and let's run with perseverance the race that is set before us, looking to Jesus, the author and perfecter of faith.", "Discipleship", "Lay it down. Run. Look to Jesus.", 5),
    V("heb13-8", "Hebrews", 13, 8, 8, "Jesus Christ is the same yesterday, today, and forever.", "Christ", "Unchanging Lord in a changing week.", 4),
    V("jas1-2", "James", 1, 2, 4, "Count it all joy, my brothers, when you fall into various temptations, knowing that the testing of your faith produces endurance. Let endurance have its perfect work, that you may be perfect and complete, lacking in nothing.", "Trials", "Joy is not denial. It is the long view.", 5),
    V("jas1-5", "James", 1, 5, 5, "But if any of you lacks wisdom, let him ask of God, who gives to all liberally and without reproach, and it will be given to him.", "Wisdom", "Ask. He does not shame the asker.", 5),
    V("jas1-22", "James", 1, 22, 22, "But be doers of the word, and not only hearers, deluding your own selves.", "Obedience", "Hearing without doing is self-deception.", 5),
    V("jas4-7", "James", 4, 7, 8, "Be subject therefore to God. Resist the devil, and he will flee from you. Draw near to God, and he will draw near to you.", "Warfare", "Submit. Resist. Draw near.", 5),
    V("1pe2-9", "1 Peter", 2, 9, 9, "But you are a chosen race, a royal priesthood, a holy nation, a people for God's own possession, that you may proclaim the excellence of him who called you out of darkness into his marvelous light.", "Identity", "Who you are, so you will say who He is.", 5),
    V("1pe5-7", "1 Peter", 5, 7, 7, "Casting all your worries on him, because he cares for you.", "Trust", "All of them. He cares.", 5),
    V("2pe1-3", "2 Peter", 1, 3, 3, "Seeing that his divine power has granted to us all things that pertain to life and godliness, through the knowledge of him who called us by his own glory and virtue.", "Holiness", "Already granted. Not waiting on a feeling.", 4),
    V("1jn1-9", "1 John", 1, 9, 9, "If we confess our sins, he is faithful and righteous to forgive us the sins, and to cleanse us from all unrighteousness.", "Repentance", "Confess. Faithful. Clean.", 5),
    V("1jn4-7", "1 John", 4, 7, 8, "Beloved, let's love one another, for love is of God; and everyone who loves has been born of God, and knows God. He who doesn't love doesn't know God, for God is love.", "Love", "God is love — so love is evidence.", 5),
    V("1jn4-19", "1 John", 4, 19, 19, "We love him, because he first loved us.", "Love", "Order of operations.", 5),
    V("1jn5-14", "1 John", 5, 14, 15, "This is the boldness which we have toward him, that if we ask anything according to his will, he listens to us.", "Prayer", "Asked in his will. Heard.", 4),
    V("jude24", "Jude", 1, 24, 25, "Now to him who is able to keep them from stumbling, and to present you faultless before the presence of his glory in great joy, to God our Savior, who alone is wise, be glory and majesty, dominion and power, both now and forever. Amen.", "Hope", "He is able to keep you.", 4),
    V("rev3-20", "Revelation", 3, 20, 20, "Behold, I stand at the door and knock. If anyone hears my voice and opens the door, then I will come in to him, and will dine with him, and he with me.", "Presence", "The knock is still happening.", 4),
    V("rev21-4", "Revelation", 21, 4, 4, "He will wipe away every tear from their eyes. Death will be no more; neither will there be mourning, nor crying, nor pain, any more. The first things have passed away.", "Hope", "The last bottom line.", 5)
  ];

  const Q = (id, q, a, d1, d2, tag) => ({ id, q, a, d: [d1, d2], tag });

  const QUIZ = [
    Q("q001", "Who created the heavens and the earth?", "God", "The angels", "Adam", "ot"),
    Q("q002", "In whose image was mankind created?", "God's", "The angels'", "The animals'", "ot"),
    Q("q003", "Who built the ark?", "Noah", "Moses", "Abraham", "ot"),
    Q("q004", "How many of each clean animal did Noah take?", "Seven pairs", "Two of every kind only", "Twelve", "ot"),
    Q("q005", "Who was called to leave his country and be a blessing?", "Abraham", "Jacob", "Joseph", "ot"),
    Q("q006", "Abraham's faith was credited to him as?", "Righteousness", "Wisdom", "Wealth", "ot"),
    Q("q007", "Who was Abraham's promised son?", "Isaac", "Ishmael", "Esau", "ot"),
    Q("q008", "Who sold Joseph into Egypt?", "His brothers", "The Philistines", "Pharaoh", "ot"),
    Q("q009", "Joseph told his brothers: you meant evil, but God meant it for?", "Good", "Judgment", "Silence", "ot"),
    Q("q010", "Who led Israel out of Egypt?", "Moses", "Joshua", "Aaron", "ot"),
    Q("q011", "God's name revealed at the bush?", "I AM WHO I AM", "El Shaddai only", "Adonai only", "ot"),
    Q("q012", "The first of the Ten Commandments?", "No other gods before me", "Do not steal", "Honor father and mother", "ot"),
    Q("q013", "What divided so Israel could cross?", "The Red Sea", "The Jordan only", "The Nile", "ot"),
    Q("q014", "Israel ate this in the wilderness?", "Manna", "Quail only", "Unleavened cakes only", "ot"),
    Q("q015", "Who was Moses' spokesman?", "Aaron", "Joshua", "Caleb", "ot"),
    Q("q016", "The Day of Atonement is also called?", "Yom Kippur", "Passover", "Pentecost", "ot"),
    Q("q017", "How many spies entered Canaan?", "Twelve", "Ten", "Seven", "ot"),
    Q("q018", "Which two spies trusted God to take the land?", "Joshua and Caleb", "Aaron and Hur", "Nadab and Abihu", "ot"),
    Q("q019", "The Shema begins: Hear, Israel: Yahweh is our God. Yahweh is?", "One", "Many", "Distant", "ot"),
    Q("q020", "Man does not live by bread only, but by every?", "Word from God's mouth", "Dream", "Sign", "ot"),
    Q("q021", "Who succeeded Moses?", "Joshua", "Caleb", "Eleazar", "ot"),
    Q("q022", "The walls of which city fell after Israel marched?", "Jericho", "Ai", "Gibeon", "ot"),
    Q("q023", "Joshua: as for me and my house, we will?", "Serve Yahweh", "Return to Egypt", "Make a treaty", "ot"),
    Q("q024", "Which judge defeated Midian with 300 men?", "Gideon", "Samson", "Barak", "ot"),
    Q("q025", "Who was the strong Nazirite judge?", "Samson", "Jephthah", "Ehud", "ot"),
    Q("q026", "Ruth said: your God will be?", "My God", "Baal", "Chemosh", "ot"),
    Q("q027", "Ruth married?", "Boaz", "Elimelech", "Mahlon still", "ot"),
    Q("q028", "Who was Israel's first king?", "Saul", "David", "Solomon", "ot"),
    Q("q029", "Who killed Goliath?", "David", "Saul", "Jonathan", "ot"),
    Q("q030", "Yahweh looks at the?", "Heart", "Height", "Face", "ot"),
    Q("q031", "David was a man after God's?", "Heart", "Army", "Throne", "ot"),
    Q("q032", "Who was David's loyal friend?", "Jonathan", "Absalom", "Joab", "ot"),
    Q("q033", "Which son of David built the temple?", "Solomon", "Absalom", "Adonijah", "ot"),
    Q("q034", "Solomon asked God for?", "Wisdom", "Long life first", "Gold first", "ot"),
    Q("q035", "The kingdom split after Solomon. Northern kingdom?", "Israel", "Judah", "Edom", "ot"),
    Q("q036", "Which prophet confronted Ahab and Jezebel?", "Elijah", "Isaiah", "Jonah", "ot"),
    Q("q037", "Elijah heard God in a?", "Still small voice", "Earthquake", "Fire", "ot"),
    Q("q038", "Who was taken up in a whirlwind?", "Elijah", "Elisha", "Enoch only", "ot"),
    Q("q039", "Which prophet succeeded Elijah?", "Elisha", "Samuel", "Micaiah", "ot"),
    Q("q040", "Assyria took which kingdom into exile?", "Israel (north)", "Judah first", "Edom", "ot"),
    Q("q041", "Babylon took which kingdom into exile?", "Judah", "Israel only", "Philistia", "ot"),
    Q("q042", "Who was the boy-king who found the Book of the Law?", "Josiah", "Joash as an infant", "Manasseh", "ot"),
    Q("q043", "Who rebuilt Jerusalem's wall?", "Nehemiah", "Ezra only", "Zerubbabel only", "ot"),
    Q("q044", "Ezra was a?", "Scribe and priest", "Soldier", "King", "ot"),
    Q("q045", "Esther became queen in?", "Persia", "Babylon still", "Egypt", "ot"),
    Q("q046", "Who plotted to destroy the Jews in Esther?", "Haman", "Mordecai", "Ahasuerus", "ot"),
    Q("q047", "Job's first response to loss included?", "Blessed be Yahweh's name", "Curse God", "Silence forever", "ot"),
    Q("q048", "Job: I know that my Redeemer?", "Lives", "Sleeps", "Has left", "ot"),
    Q("q049", "Psalm 23: Yahweh is my?", "Shepherd", "Judge only", "King only", "ps"),
    Q("q050", "Psalm 119: I have hidden your word in my?", "Heart", "House", "Hand", "ps"),
    Q("q051", "Your word is a lamp to my?", "Feet", "Enemies", "Dreams", "ps"),
    Q("q052", "Be still, and know that I am?", "God", "Safe", "Finished", "ps"),
    Q("q053", "Create in me a clean?", "Heart", "Name", "House", "ps"),
    Q("q054", "The fear of Yahweh is the beginning of?", "Wisdom", "Wealth", "War", "pr"),
    Q("q055", "Trust in Yahweh with all your?", "Heart", "Might only", "Mind only", "pr"),
    Q("q056", "Keep your heart with all diligence, for from it is the?", "Wellspring of life", "Seat of luck", "End of toil", "pr"),
    Q("q057", "A soft answer turns away?", "Wrath", "Wisdom", "Work", "pr"),
    Q("q058", "Pride goes before?", "Destruction", "Honor always", "Riches", "pr"),
    Q("q059", "Ecclesiastes' end of the matter?", "Fear God and keep his commandments", "Eat and drink only", "Gain wisdom for wealth", "ot"),
    Q("q060", "Isaiah 9: a child is born, a son is?", "Given", "Hidden", "Lost", "ot"),
    Q("q061", "Those who wait for Yahweh will renew their?", "Strength", "Wealth", "Youth only", "ot"),
    Q("q062", "Isaiah 53: by his wounds we are?", "Healed", "Warned", "Scattered", "ot"),
    Q("q063", "Don't you be afraid, for I am?", "With you", "Watching from far", "Testing only", "ot"),
    Q("q064", "Jeremiah 29: thoughts of peace, to give you hope and a?", "Future", "Throne", "Temple tax", "ot"),
    Q("q065", "The heart is deceitful above all things — which book?", "Jeremiah", "Psalms", "Proverbs only", "ot"),
    Q("q066", "Lamentations: his mercies are new every?", "Morning", "Sabbath", "Year", "ot"),
    Q("q067", "Ezekiel: I will give you a new?", "Heart", "Name only", "Land only", "ot"),
    Q("q068", "Daniel prayed how many times a day?", "Three", "Seven", "Once", "ot"),
    Q("q069", "Who was thrown to the lions?", "Daniel", "Shadrach", "Ezra", "ot"),
    Q("q070", "Who walked in the furnace with the three Hebrews?", "One like a son of the gods", "Nebuchadnezzar", "An angel named only Gabriel", "ot"),
    Q("q071", "Jonah was sent to?", "Nineveh", "Tarshish", "Babylon", "ot"),
    Q("q072", "Micah 6:8 — act justly, love mercy, and walk?", "Humbly with your God", "Proudly before kings", "Alone in the desert", "ot"),
    Q("q073", "The righteous will live by his?", "Faith", "Works only", "Lineage", "ot"),
    Q("q074", "Malachi promises the coming of?", "Elijah before the day of Yahweh", "David again", "Moses again", "ot"),
    Q("q075", "How many books in the Protestant Old Testament?", "39", "27", "66", "meta"),
    Q("q076", "How many books in the New Testament?", "27", "39", "22", "meta"),
    Q("q077", "Last book of the Old Testament?", "Malachi", "Zechariah", "Micah", "meta"),
    Q("q078", "First book of the New Testament?", "Matthew", "Genesis", "Acts", "meta"),
    Q("q079", "Jesus was born in?", "Bethlehem", "Nazareth", "Jerusalem", "nt"),
    Q("q080", "Jesus grew up in?", "Nazareth", "Bethlehem", "Capernaum only", "nt"),
    Q("q081", "Who baptized Jesus?", "John the Baptist", "Peter", "Andrew", "nt"),
    Q("q082", "Jesus' first recorded miracle?", "Water to wine", "Feeding 5,000", "Walking on water", "nt"),
    Q("q083", "How many days was Jesus tempted in the wilderness?", "40", "7", "12", "nt"),
    Q("q084", "Jesus answered Satan with?", "It is written", "A new sign", "Silence only", "nt"),
    Q("q085", "The first Beatitude: Blessed are the poor in?", "Spirit", "Gold", "Friends", "nt"),
    Q("q086", "Seek first God's Kingdom and his?", "Righteousness", "Miracles", "Titles", "nt"),
    Q("q087", "The greatest commandment is to love?", "The Lord your God", "Yourself first", "The law itself", "nt"),
    Q("q088", "The second is like it: love your?", "Neighbor as yourself", "Nation only", "Family only", "nt"),
    Q("q089", "Jesus: I am the way, the truth, and the?", "Life", "Law", "Temple", "nt"),
    Q("q090", "Jesus: I am the vine, you are the?", "Branches", "Roots", "Soil", "nt"),
    Q("q091", "Apart from me you can do?", "Nothing", "Most things", "Some good", "nt"),
    Q("q092", "For God so loved the world that he gave his?", "One and only Son", "Law", "Angels", "nt"),
    Q("q093", "Who denied Jesus three times?", "Peter", "Judas", "Thomas", "nt"),
    Q("q094", "Who betrayed Jesus?", "Judas Iscariot", "Pilate", "Caiaphas only", "nt"),
    Q("q095", "Jesus was crucified at?", "Golgotha", "Bethany", "Jericho", "nt"),
    Q("q096", "On which day did Jesus rise?", "The third day", "The seventh day", "The fortieth day", "nt"),
    Q("q097", "Who first found the empty tomb in the Gospels?", "Women disciples", "Peter alone", "The guards", "nt"),
    Q("q098", "Thomas wanted to see the?", "Wounds", "Angels", "Scroll", "nt"),
    Q("q099", "The Great Commission: go and make?", "Disciples", "Spectators", "Kings", "nt"),
    Q("q100", "I am with you always, to the end of the?", "Age", "Week", "Temple", "nt"),
    Q("q101", "Come to me, all who labor, and I will give you?", "Rest", "Gold", "Rank", "nt"),
    Q("q102", "The Lord's Prayer begins: Our Father in?", "Heaven", "Israel", "the temple", "nt"),
    Q("q103", "How many disciples did Jesus name as apostles?", "Twelve", "Seventy only", "Three", "nt"),
    Q("q104", "Which Gospel starts 'In the beginning was the Word'?", "John", "Matthew", "Luke", "nt"),
    Q("q105", "Which Gospel is addressed to Theophilus?", "Luke", "Mark", "John", "nt"),
    Q("q106", "Which Gospel is shortest?", "Mark", "John", "Matthew", "nt"),
    Q("q107", "Parable: a sower sowed?", "Seed", "Silver", "Soldiers", "nt"),
    Q("q108", "Parable: the prodigal son was met by a?", "Running father", "Closed door", "Hired judge", "nt"),
    Q("q109", "Parable: the good Samaritan showed mercy to a?", "Wounded traveler", "Priest", "Levite", "nt"),
    Q("q110", "Jesus fed 5,000 with?", "Five loaves and two fish", "Seven loaves only", "Manna", "nt"),
    Q("q111", "Who walked on water toward Jesus, then sank?", "Peter", "John", "Andrew", "nt"),
    Q("q112", "Lazarus was raised in?", "Bethany", "Jericho", "Nazareth", "nt"),
    Q("q113", "Pentecost: the Spirit came like?", "Wind and tongues of fire", "A dove only", "A quiet dream", "nt"),
    Q("q114", "You will receive power when the Holy Spirit comes, and you will be?", "Witnesses", "Rulers", "Silent", "nt"),
    Q("q115", "The church began in?", "Jerusalem", "Rome", "Antioch first", "nt"),
    Q("q116", "Who preached at Pentecost?", "Peter", "Paul", "James", "nt"),
    Q("q117", "Who was the first Christian martyr in Acts?", "Stephen", "James son of Zebedee", "John", "nt"),
    Q("q118", "Saul of Tarsus met Jesus on the road to?", "Damascus", "Jericho", "Rome", "nt"),
    Q("q119", "Saul became known as?", "Paul", "Barnabas", "Silas", "nt"),
    Q("q120", "There is salvation in no one else — whose sermon?", "Peter's, Acts 4", "Stephen's only", "Philip's only", "nt"),
    Q("q121", "Believe in the Lord Jesus, and you will be?", "Saved", "Famous", "Spared prison only", "nt"),
    Q("q122", "Paul's trade?", "Tentmaker", "Fisherman", "Tax collector", "nt"),
    Q("q123", "Paul was a citizen of?", "Rome", "Athens", "Babylon", "nt"),
    Q("q124", "Romans: all have sinned and fall short of the?", "Glory of God", "Law of Moses only", "Temple tax", "nt"),
    Q("q125", "The wages of sin is?", "Death", "A fine", "Exile only", "nt"),
    Q("q126", "The free gift of God is?", "Eternal life in Christ", "Long life on earth", "A second chance at law", "nt"),
    Q("q127", "There is now no condemnation for those in?", "Christ Jesus", "Israel only", "the temple", "nt"),
    Q("q128", "All things work together for good for those who?", "Love God", "Try harder", "Never fail", "nt"),
    Q("q129", "If you confess Jesus as Lord and believe God raised him, you will be?", "Saved", "Famous", "Sinless instantly in practice", "nt"),
    Q("q130", "Do not be conformed to this world, but be?", "Transformed by renewing your mind", "Hidden from it", "Angry at it", "nt"),
    Q("q131", "Your body is a temple of the?", "Holy Spirit", "Law", "Nation", "nt"),
    Q("q132", "Whether you eat or drink, do all to the?", "Glory of God", "Praise of men", "Rule of appetite", "nt"),
    Q("q133", "Love is patient and is?", "Kind", "Proud", "Easy", "nt"),
    Q("q134", "The greatest of faith, hope, and love is?", "Love", "Faith", "Hope", "nt"),
    Q("q135", "If anyone is in Christ, he is a?", "New creation", "Better version", "Secret disciple", "nt"),
    Q("q136", "My grace is sufficient for you, for my power is made perfect in?", "Weakness", "Talent", "Numbers", "nt"),
    Q("q137", "I have been crucified with Christ; it is no longer I who live, but?", "Christ lives in me", "The law lives in me", "Memory lives in me", "nt"),
    Q("q138", "Walk by the Spirit and you won't fulfill the lust of the?", "Flesh", "World's news", "Mind only", "nt"),
    Q("q139", "First fruit of the Spirit listed?", "Love", "Joy", "Peace", "nt"),
    Q("q140", "Fruit of the Spirit includes self-?", "Control", "Promotion", "Defense", "nt"),
    Q("q141", "By grace you have been saved through?", "Faith", "Works", "Lineage", "nt"),
    Q("q142", "We are his workmanship, created in Christ Jesus for?", "Good works", "Arguments", "Ease", "nt"),
    Q("q143", "Put on the whole armor of?", "God", "Rome", "Self", "nt"),
    Q("q144", "The sword of the Spirit is the?", "Word of God", "Gift of tongues", "Law of Moses", "nt"),
    Q("q145", "He who began a good work in you will?", "Complete it", "Pause it", "Transfer it", "nt"),
    Q("q146", "In nothing be anxious, but in everything by prayer… with?", "Thanksgiving", "Fear", "Bargaining", "nt"),
    Q("q147", "The peace of God will guard your?", "Hearts and thoughts", "Reputation", "Schedule", "nt"),
    Q("q148", "I can do all things through?", "Christ who strengthens me", "Positive thinking", "Discipline alone", "nt"),
    Q("q149", "Set your mind on things that are?", "Above", "Tomorrow", "Hidden", "nt"),
    Q("q150", "Whatever you do, work heartily as for the?", "Lord", "Boss", "Reward", "nt"),
    Q("q151", "Pray without?", "Ceasing", "Feeling", "Words", "nt"),
    Q("q152", "God didn't give us a spirit of fear, but of power, love, and?", "Self-control", "Ambition", "Silence", "nt"),
    Q("q153", "Every Scripture is God-breathed and profitable for?", "Teaching, reproof, correction, training", "Debate only", "History only", "nt"),
    Q("q154", "The word of God is living and active, sharper than a?", "Two-edged sword", "Whip", "Hammer", "nt"),
    Q("q155", "Draw near with boldness to the throne of?", "Grace", "Judgment only", "David", "nt"),
    Q("q156", "Faith is assurance of things hoped for, proof of things?", "Not seen", "Already owned", "Written in stone only", "nt"),
    Q("q157", "Looking to Jesus, the author and perfecter of?", "Faith", "the law", "Rome", "nt"),
    Q("q158", "Jesus Christ is the same yesterday, today, and?", "Forever", "Until the temple", "For Israel only", "nt"),
    Q("q159", "Count it all joy when you meet?", "Trials", "Praise", "Ease", "nt"),
    Q("q160", "If anyone lacks wisdom, let him?", "Ask of God", "Wait for age", "Buy books only", "nt"),
    Q("q161", "Be doers of the word, and not only?", "Hearers", "Teachers", "Critics", "nt"),
    Q("q162", "Resist the devil and he will?", "Flee", "Negotiate", "Grow", "nt"),
    Q("q163", "Cast all your worries on him, because he?", "Cares for you", "Ignores small things", "Tests you first", "nt"),
    Q("q164", "You are a chosen race, a royal?", "Priesthood", "Army only", "Court", "nt"),
    Q("q165", "If we confess our sins, he is faithful to?", "Forgive and cleanse", "Overlook without change", "Postpone", "nt"),
    Q("q166", "We love because he?", "First loved us", "Commanded only", "Rewarded us first", "nt"),
    Q("q167", "God is?", "Love", "Only judge", "Energy", "nt"),
    Q("q168", "I stand at the door and?", "Knock", "Wait in silence", "Break it", "nt"),
    Q("q169", "He will wipe away every?", "Tear", "Memory", "Nation", "nt"),
    Q("q170", "The last book of the Bible?", "Revelation", "Jude", "Malachi", "meta"),
    Q("q171", "How many Gospels?", "Four", "Three", "Five", "meta"),
    Q("q172", "Pentateuch is the first how many books?", "Five", "Ten", "Twelve", "meta"),
    Q("q173", "Wisdom books include Job, Psalms, Proverbs, Ecclesiastes, and?", "Song of Solomon", "Isaiah", "Joshua", "meta"),
    Q("q174", "Major prophets: Isaiah, Jeremiah, Lamentations, Ezekiel, and?", "Daniel", "Hosea", "Amos", "meta"),
    Q("q175", "Who wrote most New Testament letters?", "Paul", "Peter", "John", "nt"),
    Q("q176", "Hebrews presents Jesus as greater than?", "Angels, Moses, and the priesthood", "David only", "Solomon only", "nt"),
    Q("q177", "James, John, and Jude are?", "General epistles (with Peter)", "Gospels", "Law", "meta"),
    Q("q178", "The fruit of the Spirit is not a?", "Work of the flesh", "Gift you earn", "Feeling you chase only", "nt"),
    Q("q179", "Armor: belt of?", "Truth", "Gold", "Pride", "nt"),
    Q("q180", "Armor: shield of?", "Faith", "Doubt", "Reason only", "nt"),
    Q("q181", "Armor: helmet of?", "Salvation", "Ambition", "Knowledge only", "nt"),
    Q("q182", "Blessed are the meek, for they shall inherit the?", "Earth", "Temple", "Throne of Caesar", "nt"),
    Q("q183", "Blessed are the peacemakers, for they shall be called?", "Sons of God", "Judges", "Kings of Israel", "nt"),
    Q("q184", "Jesus washed the disciples'?", "Feet", "Hands only", "Heads", "nt"),
    Q("q185", "The new covenant is in Jesus'?", "Blood", "Name only", "Miracles only", "nt"),
    Q("q186", "On Pentecost about how many were added?", "About 3,000", "Twelve", "Seventy", "nt"),
    Q("q187", "Barnabas's name means?", "Son of encouragement", "Son of thunder", "Rock", "nt"),
    Q("q188", "The first Gentile household to receive the Spirit in Acts 10?", "Cornelius", "Lydia", "the jailer", "nt"),
    Q("q189", "Lydia was a seller of?", "Purple", "Grain", "Tents", "nt"),
    Q("q190", "Priscilla and Aquila taught?", "Apollos", "Timothy only", "Titus only", "nt"),
    Q("q191", "Timothy's grandmother was?", "Lois", "Eunice", "Lydia", "nt"),
    Q("q192", "The city of Paul's longest stay on a journey?", "Ephesus (about 3 years)", "Athens", "Rome only", "nt"),
    Q("q193", "Which church received 1–2 Corinthians?", "Corinth", "Colossae", "Crete", "nt"),
    Q("q194", "Philippi was in?", "Macedonia", "Achaia", "Galatia", "nt"),
    Q("q195", "Who was the runaway slave in Philemon?", "Onesimus", "Tychicus", "Epaphras", "nt"),
    Q("q196", "Revelation was written to how many churches in Asia?", "Seven", "Twelve", "Three", "nt"),
    Q("q197", "The Lamb who was slain is worthy — which book?", "Revelation", "Hebrews only", "Psalms only", "nt"),
    Q("q198", "New Jerusalem has no need of sun, for its lamp is the?", "Lamb", "Temple", "Moon", "nt"),
    Q("q199", "The first promise of a coming seed is in?", "Genesis 3", "Exodus 3", "Psalm 2 only", "ot"),
    Q("q200", "Melchizedek was king of?", "Salem", "Sodom", "Egypt", "ot"),
    Q("q201", "Passover lamb's blood was put on the?", "Doorposts", "Altar only", "Foreheads", "ot"),
    Q("q202", "The bronze serpent was lifted in?", "The wilderness", "The temple", "Jericho", "ot"),
    Q("q203", "Jesus compared himself to the bronze serpent in?", "John 3", "Matthew 5", "Luke 4", "nt"),
    Q("q204", "Bethlehem means house of?", "Bread", "War", "Kings", "nt"),
    Q("q205", "Immanuel means?", "God with us", "God is fire", "Yahweh saves only", "nt"),
    Q("q206", "Jesus means Yahweh?", "Saves", "Sees", "Fights", "nt"),
    Q("q207", "The Comforter / Helper Jesus promised is the?", "Holy Spirit", "an angel of the church", "the law", "nt"),
    Q("q208", "Gifts of the Spirit are given for the?", "Common good", "Private rank", "Show", "nt"),
    Q("q209", "The church is called the body of?", "Christ", "Moses", "David", "nt"),
    Q("q210", "Husbands, love your wives as Christ loved the?", "Church", "World in general only", "Law", "nt"),
    Q("q211", "Children, obey your parents in the?", "Lord", "Nation", "Temple", "nt"),
    Q("q212", "The Lord's supper proclaims the Lord's death until he?", "Comes", "Is forgotten", "Is named king in Rome", "nt"),
    Q("q213", "Baptism pictures union with Christ in?", "Death and resurrection", "Fame", "the law only", "nt"),
    Q("q214", "Who wrote Revelation?", "John", "Paul", "Peter", "nt"),
    Q("q215", "Blessed is the one who reads and those who hear the words of this?", "Prophecy (Revelation)", "Proverb", "Psalm only", "nt"),
    Q("q216", "The river of the water of life flows from the throne of God and of the?", "Lamb", "Elders", "Angels", "nt"),
    Q("q217", "Let justice roll on like?", "Rivers", "Smoke", "Armies", "ot"),
    Q("q218", "What does Yahweh require: act justly, love mercy, walk?", "Humbly", "Wealthy", "Alone", "ot"),
    Q("q219", "The joy of Yahweh is your?", "Strength", "Reward only", "Song only", "ot"),
    Q("q220", "This is the day Yahweh has made; we will?", "Rejoice and be glad in it", "Wait for tomorrow", "Hide", "ps")
  ];

  const empty = () => ({ verses: {}, quiz: {}, daily: {}, stats: { verseReviews: 0, quiz: 0, quizRight: 0 } });

  const load = () => {
    try {
      const s = JSON.parse(localStorage.getItem(LS) || "null");
      if (!s || typeof s !== "object") return empty();
      return {
        verses: s.verses || {},
        quiz: s.quiz || {},
        daily: s.daily || {},
        stats: Object.assign({ verseReviews: 0, quiz: 0, quizRight: 0 }, s.stats || {})
      };
    } catch {
      return empty();
    }
  };

  const save = (data) => {
    data.updated_at = new Date().toISOString();
    localStorage.setItem(LS, JSON.stringify(data));
    try {
      if (window.AlignDB && AlignDB.saveScripture) AlignDB.saveScripture(data);
    } catch { /* local copy still good */ }
    return data;
  };

  const refOf = (v) => {
    if (!v) return "";
    if (v.thru && v.thru !== v.verse) return v.book + " " + v.chapter + ":" + v.verse + "–" + v.thru;
    return v.book + " " + v.chapter + ":" + v.verse;
  };

  const byId = (id) => VERSES.find((v) => v.id === id) || null;

  const cardOf = (store, kind, id) => {
    const row = (store[kind] || {})[id];
    return row || { ease: 2.5, interval: 0, reps: 0, lapses: 0, due: 0, last: 0 };
  };

  /* SM-2. Grade 0 again, 1 hard, 2 good, 3 easy.
     Quiz: wrong = again (due now → next sprint). Right = good (1 day, then 3, then growing).
     Verse: again = tomorrow; hard ≈ 12h then 2d; good = 1d then 3d; easy = 2d then 5d, then ease × interval. */
  const review = (card, grade) => {
    let ease = Number(card.ease) || 2.5;
    let interval = Number(card.interval) || 0;
    let reps = Number(card.reps) || 0;
    let lapses = Number(card.lapses) || 0;
    if (grade <= 0) {
      lapses += 1;
      reps = 0;
      interval = 0;
      ease = Math.max(1.3, ease - 0.2);
    } else {
      if (reps === 0) interval = grade === 1 ? 0.5 : grade === 2 ? 1 : 2;
      else if (reps === 1) interval = grade === 1 ? 2 : grade === 2 ? 3 : 5;
      else {
        const f = grade === 1 ? 1.2 : grade === 3 ? ease * 1.3 : ease;
        interval = Math.max(1, Math.round(interval * f * 10) / 10);
      }
      if (grade === 1) ease = Math.max(1.3, ease - 0.15);
      if (grade === 3) ease = ease + 0.1;
      reps += 1;
    }
    const due = Date.now() + Math.max(0, interval) * DAY_MS;
    return { ease, interval, reps, lapses, due, last: Date.now() };
  };

  const gradeQuiz = (id, correct) => {
    const data = load();
    const next = review(cardOf(data, "quiz", id), correct ? 2 : 0);
    data.quiz[id] = next;
    data.stats.quiz = (data.stats.quiz || 0) + 1;
    if (correct) data.stats.quizRight = (data.stats.quizRight || 0) + 1;
    save(data);
    return next;
  };

  const gradeVerse = (id, grade, meta) => {
    const data = load();
    const prev = data.verses[id] || {};
    const next = Object.assign({}, prev, review(cardOf(data, "verses", id), grade), meta || {});
    data.verses[id] = next;
    data.stats.verseReviews = (data.stats.verseReviews || 0) + 1;
    save(data);
    return next;
  };

  const dueVerses = () => {
    const data = load();
    const now = Date.now();
    return Object.keys(data.verses)
      .map((id) => {
        const c = data.verses[id] || {};
        const v = byId(id) || {
          id, book: c.book, chapter: c.chapter, verse: c.verse, thru: c.thru,
          text: c.text, theme: c.theme, why: c.why, custom: true
        };
        return { v, card: c };
      })
      .filter((x) => x.card && x.card.due <= now)
      .sort((a, b) => (a.card.due || 0) - (b.card.due || 0));
  };

  const learnedCount = () => Object.keys(load().verses).length;

  const verseStreak = () => {
    const data = load();
    const dailies = data.daily || {};
    let n = 0;
    const d = new Date();
    const iso = (x) => {
      const y = x.getFullYear();
      const m = String(x.getMonth() + 1).padStart(2, "0");
      const day = String(x.getDate()).padStart(2, "0");
      return y + "-" + m + "-" + day;
    };
    if (!(dailies[iso(d)] && dailies[iso(d)].verseDone)) d.setDate(d.getDate() - 1);
    for (let i = 0; i < 365; i++) {
      const row = dailies[iso(d)];
      if (row && row.verseDone) { n++; d.setDate(d.getDate() - 1); }
      else break;
    }
    return n;
  };

  const recentlyUsed = (days = 21) => {
    const data = load();
    const cut = Date.now() - days * DAY_MS;
    const ids = new Set();
    Object.keys(data.verses).forEach((id) => {
      const c = data.verses[id];
      if (c && c.added && c.added > cut) ids.add(id);
    });
    Object.keys(data.daily || {}).forEach((iso) => {
      const id = data.daily[iso] && data.daily[iso].verseId;
      if (id) ids.add(id);
    });
    return ids;
  };

  const fromChapter = (book, chapter, verses) => {
    const list = (verses || []).map((v) => {
      const text = String(v.text || "").replace(/\s+/g, " ").trim();
      let score = 0;
      const n = text.length;
      if (n >= 40 && n <= 220) score += 3;
      else if (n >= 24 && n <= 280) score += 1;
      if (/(Yahweh|Lord|God|faith|love|heart|trust|peace|Spirit|believe|mercy|grace)/i.test(text)) score += 3;
      if (/(begat|son of|cubit|shekel|cubits|genealogy|thousand thousands)/i.test(text)) score -= 6;
      if (/^(The word of|Thus says|He said)/i.test(text)) score += 1;
      return {
        id: "read-" + book.replace(/\s+/g, "").toLowerCase() + "-" + chapter + "-" + v.verse,
        book, chapter, verse: v.verse, thru: v.verse, text,
        theme: "Today's reading",
        why: "The line that carries this chapter — hide it so the rest stays.",
        score, custom: true
      };
    }).filter((v) => v.text);
    list.sort((a, b) => b.score - a.score);
    return list[0] || null;
  };

  const pickFromReadings = (readings, chapterPacks) => {
    const used = recentlyUsed(18);
    const hits = VERSES.filter((v) =>
      (readings || []).some((r) => r.book === v.book && Number(r.chapter) === Number(v.chapter))
    );
    const fresh = hits.filter((v) => !used.has(v.id));
    const pool = (fresh.length ? fresh : hits).slice().sort((a, b) => b.score - a.score);
    if (pool[0]) return pool[0];
    const packs = chapterPacks || [];
    for (let i = packs.length - 1; i >= 0; i--) {
      const p = packs[i];
      const fb = fromChapter(p.book, p.chapter, p.verses);
      if (fb && fb.score >= 2) return fb;
    }
    if (packs[0]) return fromChapter(packs[0].book, packs[0].chapter, packs[0].verses);
    return VERSES.find((v) => v.id === "ps119-11") || VERSES[0];
  };

  const ensureTodayVerse = (iso, readings, chapterPacks) => {
    const data = load();
    const row = data.daily[iso] || {};
    if (row.verseId) {
      const known = byId(row.verseId);
      if (known) return { verse: known, daily: row, reused: true };
      if (row.verseSnap) return { verse: row.verseSnap, daily: row, reused: true };
    }
    const verse = pickFromReadings(readings, chapterPacks);
    const snap = {
      id: verse.id, book: verse.book, chapter: verse.chapter, verse: verse.verse,
      thru: verse.thru, text: verse.text, theme: verse.theme, why: verse.why, custom: !!verse.custom
    };
    data.daily[iso] = Object.assign({}, row, { verseId: verse.id, verseSnap: snap });
    if (!data.verses[verse.id]) {
      data.verses[verse.id] = {
        ease: 2.5, interval: 0, reps: 0, lapses: 0, due: Date.now(), last: 0,
        added: Date.now(), book: verse.book, chapter: verse.chapter, verse: verse.verse,
        thru: verse.thru, text: verse.text, theme: verse.theme, why: verse.why
      };
    }
    save(data);
    return { verse: snap, daily: data.daily[iso], reused: false };
  };

  const markVerseDone = (iso) => {
    const data = load();
    const row = data.daily[iso] || {};
    row.verseDone = true;
    data.daily[iso] = row;
    save(data);
    return row;
  };

  const todayVerse = (iso) => {
    const data = load();
    const row = data.daily[iso] || {};
    if (row.verseSnap) return row.verseSnap;
    if (row.verseId) return byId(row.verseId);
    return null;
  };

  const shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  };

  const optionsOf = (item) => shuffle([item.a].concat(item.d || []));

  const STOP = /^(the|and|that|this|with|from|they|them|then|than|when|what|your|their|have|been|were|will|shall|unto|into|upon|for|but|not|you|his|her|its|was|are|has|had|who|whom|which|there|these|those|also|into|onto)$/i;
  const SKIP_LINE = /(begat|cubit|shekel|genealogy|thousand thousands)/i;
  const FALLBACK_D = ["heaven", "earth", "covenant", "Israel", "mercy", "faith", "Spirit", "heart", "peace", "glory", "wisdom", "promise", "wilderness", "temple", "kingdom"];

  const cleanText = (s) => String(s || "").replace(/\s+/g, " ").trim();

  const contentWords = (text) => cleanText(text).split(/\s+/).map((w) => {
    const core = w.replace(/[^A-Za-z']/g, "");
    return core;
  }).filter((w) => w.length >= 4 && !STOP.test(w));

  const pickBlank = (text) => {
    const words = contentWords(text);
    if (!words.length) return null;
    const ranked = words.slice().sort((a, b) => {
      const sc = (w) => ( /^[A-Z]/.test(w) ? 4 : 0) + (/(Yahweh|Lord|God|Jesus|Christ|Spirit|faith|love|heart|holy)/i.test(w) ? 5 : 0) + Math.min(w.length, 10);
      return sc(b) - sc(a);
    });
    return ranked[0];
  };

  const twoOthers = (answer, pool) => {
    const a = String(answer || "");
    const uniq = [];
    pool.forEach((w) => {
      const s = String(w || "").trim();
      if (!s || s.toLowerCase() === a.toLowerCase()) return;
      if (!uniq.some((x) => x.toLowerCase() === s.toLowerCase())) uniq.push(s);
    });
    const out = shuffle(uniq).slice(0, 2);
    FALLBACK_D.forEach((w) => {
      if (out.length >= 2) return;
      if (w.toLowerCase() === a.toLowerCase()) return;
      out.push(w);
    });
    while (out.length < 2) out.push(out[0] === "mercy" ? "faith" : "mercy");
    return out.slice(0, 2);
  };

  const fromPacks = (packs, iso) => {
    const list = [];
    const allWords = [];
    const verses = [];
    (packs || []).forEach((p) => {
      (p.verses || []).forEach((v) => {
        const text = cleanText(v.text || v);
        if (!text || text.length < 28 || SKIP_LINE.test(text)) return;
        const row = {
          book: p.book || v.book_name || v.book,
          chapter: Number(p.chapter || v.chapter),
          verse: Number(v.verse || v.n || 0),
          text
        };
        if (!row.book || !row.chapter || !row.verse) return;
        verses.push(row);
        contentWords(text).forEach((w) => allWords.push(w));
      });
    });
    verses.forEach((v) => {
      const ref = v.book + " " + v.chapter + ":" + v.verse;
      const blank = pickBlank(v.text);
      if (blank) {
        const re = new RegExp("\\b" + blank.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b");
        const shown = v.text.replace(re, "____");
        if (shown !== v.text) {
          const d = twoOthers(blank, allWords);
          list.push({
            id: "rd:" + iso + ":" + v.book.replace(/\s+/g, "") + ":" + v.chapter + ":" + v.verse + ":cloze",
            q: ref + " — “" + shown + "”",
            a: blank,
            d,
            tag: "read",
            ref
          });
        }
      }
      const quote = v.text.length > 110 ? v.text.slice(0, 96).replace(/\s+\S*$/, "") + "…" : v.text;
      const otherRefs = verses.filter((x) => !(x.book === v.book && x.chapter === v.chapter && x.verse === v.verse))
        .map((x) => x.book + " " + x.chapter + ":" + x.verse);
      otherRefs.push(v.book + " " + v.chapter + ":" + Math.max(1, v.verse - 1));
      otherRefs.push(v.book + " " + v.chapter + ":" + (v.verse + 1));
      const d = twoOthers(ref, otherRefs);
      list.push({
        id: "rd:" + iso + ":" + v.book.replace(/\s+/g, "") + ":" + v.chapter + ":" + v.verse + ":ref",
        q: "Which verse says: “" + quote + "”",
        a: ref,
        d,
        tag: "read",
        ref
      });
    });
    const seen = new Set();
    return list.filter((q) => {
      if (seen.has(q.id) || !q.a || q.a === q.d[0]) return false;
      seen.add(q.id);
      return true;
    });
  };

  const readingQs = (iso) => ((load().daily[iso] || {}).readingQs) || [];

  const ingestReading = (iso, packs) => {
    const built = fromPacks(packs, iso);
    if (!built.length) return [];
    const data = load();
    const row = data.daily[iso] || {};
    const have = {};
    (row.readingQs || []).forEach((q) => { have[q.id] = q; });
    built.forEach((q) => { if (!have[q.id]) have[q.id] = q; });
    row.readingQs = Object.values(have);
    row.readRefs = (packs || []).map((p) => p.book + " " + p.chapter);
    data.daily[iso] = row;
    save(data);
    return row.readingQs;
  };

  const parseAiQuiz = (text) => {
    const m = String(text || "").match(/\[[\s\S]*\]/);
    if (!m) return [];
    try {
      const arr = JSON.parse(m[0]);
      if (!Array.isArray(arr)) return [];
      return arr.map((row, i) => {
        const q = cleanText(row.q || row.question);
        const a = cleanText(row.a || row.answer);
        const d1 = cleanText(row.d1 || (row.d && row.d[0]) || row.wrong1);
        const d2 = cleanText(row.d2 || (row.d && row.d[1]) || row.wrong2);
        if (!q || !a || !d1 || !d2) return null;
        return { q, a, d: [d1, d2], i };
      }).filter(Boolean);
    } catch {
      return [];
    }
  };

  const enrichReading = async (iso, packs) => {
    const data0 = load();
    const row0 = data0.daily[iso] || {};
    if (row0.aiQuizDone) return readingQs(iso);
    const body = (packs || []).map((p) => {
      const vs = (p.verses || []).slice(0, 40).map((v) => (v.verse || "") + ". " + cleanText(v.text || v)).join(" ");
      return (p.book || "") + " " + (p.chapter || "") + "\n" + vs;
    }).join("\n\n").slice(0, 3800);
    if (body.length < 80) return readingQs(iso);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          maxOutputTokens: 1200,
          system: "You write short Bible quizzes only from the given World English Bible text. Return a JSON array only. No markdown. Each item: {\"q\":\"...\",\"a\":\"correct\",\"d1\":\"wrong\",\"d2\":\"wrong\"}. Facts must appear in the text. One sentence stems.",
          prompt: "Write 8 multiple-choice questions about this reading only:\n\n" + body
        })
      });
      const js = await res.json().catch(() => ({}));
      const made = parseAiQuiz(js.text || "");
      if (!made.length) {
        const data = load();
        const row = data.daily[iso] || {};
        row.aiQuizDone = true;
        data.daily[iso] = row;
        save(data);
        return readingQs(iso);
      }
      const data = load();
      const row = data.daily[iso] || {};
      const have = {};
      (row.readingQs || []).forEach((q) => { have[q.id] = q; });
      made.forEach((q, i) => {
        const id = "rd:" + iso + ":ai:" + i;
        if (!have[id]) have[id] = { id, q: q.q, a: q.a, d: q.d, tag: "read-ai", ref: (row.readRefs || []).join(", ") };
      });
      row.readingQs = Object.values(have);
      row.aiQuizDone = true;
      data.daily[iso] = row;
      save(data);
    } catch {
      /* local questions still stand */
    }
    return readingQs(iso);
  };

  const allReadingBank = () => {
    const data = load();
    const out = [];
    Object.keys(data.daily || {}).forEach((iso) => {
      (data.daily[iso].readingQs || []).forEach((q) => out.push(q));
    });
    return out;
  };

  const takeN = (n, groups) => {
    const seen = new Set();
    const out = [];
    groups.forEach((arr) => {
      (arr || []).forEach((q) => {
        if (!q || out.length >= n || seen.has(q.id)) return;
        seen.add(q.id);
        out.push(q);
      });
    });
    if (!out.length) return out;
    let i = 0;
    const pool = out.slice();
    while (out.length < n && pool.length) {
      out.push(pool[i % pool.length]);
      i += 1;
      if (i > n * 4) break;
    }
    return out;
  };

  const dailyQueue = (n = SPRINT_N, mode = "morning", iso) => {
    const data = load();
    const now = Date.now();
    const todayQs = iso ? readingQs(iso) : [];
    const bank = todayQs.length ? allReadingBank() : QUIZ.slice();
    const missed = [];
    const due = [];
    const fresh = [];
    const later = [];
    const bucket = (q) => {
      const c = data.quiz[q.id];
      if (!c) fresh.push(q);
      else if ((c.lapses || 0) > 0 && (c.reps || 0) === 0) missed.push(q);
      else if (c.due <= now) due.push(q);
      else later.push(q);
    };
    if (todayQs.length) {
      todayQs.forEach(bucket);
      bank.forEach((q) => {
        if (todayQs.some((t) => t.id === q.id)) return;
        bucket(q);
      });
    } else {
      bank.forEach(bucket);
    }
    const byDue = (a, b) => {
      const ca = data.quiz[a.id], cb = data.quiz[b.id];
      return ((ca && ca.due) || 0) - ((cb && cb.due) || 0);
    };
    missed.sort(byDue);
    due.sort(byDue);
    if (mode === "night") {
      return takeN(n, [missed, shuffle(later), due, shuffle(fresh)]);
    }
    return takeN(n, [missed, shuffle(fresh), due, shuffle(later)]);
  };

  const markSprint = (iso, payload, mode) => {
    const data = load();
    const row = data.daily[iso] || {};
    const key = mode === "night" ? "nightSprint" : "sprint";
    row[key] = Object.assign({}, row[key] || {}, payload);
    data.daily[iso] = row;
    save(data);
    return row[key];
  };

  const sprintOf = (iso) => (load().daily[iso] || {}).sprint || null;
  const nightSprintOf = (iso) => (load().daily[iso] || {}).nightSprint || null;

  const clozeOf = (text, want = 4) => {
    const parts = String(text || "").split(/(\s+)/);
    const idxs = [];
    parts.forEach((p, i) => {
      const w = p.replace(/[^A-Za-z]/g, "");
      if (w.length >= 4 && !/^(that|this|with|from|they|them|then|than|when|what|your|their|have|been|were|will|shall|unto)$/i.test(w)) {
        idxs.push(i);
      }
    });
    const pick = shuffle(idxs).slice(0, Math.min(want, idxs.length)).sort((a, b) => a - b);
    const answers = pick.map((i) => parts[i].replace(/[^A-Za-z']/g, ""));
    return { parts, pick, answers };
  };

  const initialsOf = (text) => String(text || "")
    .split(/\s+/)
    .map((w) => {
      const m = w.match(/[A-Za-z]/);
      const rest = w.replace(/[A-Za-z]/g, "");
      return (m ? m[0] : "") + (w.replace(/[^A-Za-z]/g, "").length > 1 ? "…" : "") + rest;
    })
    .join(" ");

  const stats = () => {
    const data = load();
    const due = dueVerses().length;
    const learned = Object.keys(data.verses).length;
    const quizN = data.stats.quiz || 0;
    const quizRight = data.stats.quizRight || 0;
    return {
      learned, due,
      quizN, quizRight,
      acc: quizN ? Math.round((quizRight / quizN) * 100) : 0,
      verseStreak: verseStreak()
    };
  };

  return {
    VERSES, QUIZ, SPRINT_SEC, SPRINT_N,
    load, save, refOf, byId,
    review, gradeQuiz, gradeVerse,
    dueVerses, learnedCount, verseStreak,
    pickFromReadings, fromChapter, ensureTodayVerse,
    markVerseDone, todayVerse,
    shuffle, optionsOf, dailyQueue, markSprint, sprintOf, nightSprintOf,
    ingestReading, enrichReading, readingQs, fromPacks,
    clozeOf, initialsOf, stats, cardOf
  };
})();
