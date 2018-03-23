var sense = require("sense-hat-led");

function flashRed(){
    sense.clear([255, 0, 0]);
    setTimeout(sense.clear, 100);
}

// or


flashRed();
