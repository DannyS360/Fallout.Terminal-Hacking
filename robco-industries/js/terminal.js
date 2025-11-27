/*
	Fallout 3 Terminal Hacking Clone
	Design and concept inspired by (read: ripped off from) Fallout 3
	All copyrights and trademarks inc. Fallout property of Bethesda, Zenimax, possibly Interplay

	wordlist-example:
	{"words":["testacy","vespers","bewitch","recheck","stretch","busiest","bedrock","beakers","beleapt","bedewed","beshame","befrets"]}
*/

var columnHeight = 17;
var wordColumnWidth = 12;

// How many words to show on screen.
// Tweak these later, but 12 is pretty classic.
var Count = 12;

// Map difficulty keyword -> word length
var DifficultyMap = {
    veryeasy: 5,
    easy: 6,
    medium: 7,
    hard: 8,
    veryhard: 9
};

// Helper to read ?difficulty= from the URL
function getQueryParam(name) {
    var match = new RegExp("[?&]" + name + "=([^&]*)").exec(window.location.search);
    return match && decodeURIComponent(match[1].replace(/\+/g, " "));
}

// Get difficulty from URL, default to "medium"
var difficultyKey = (getQueryParam("difficulty") || "medium").toLowerCase();
if (!DifficultyMap[difficultyKey]) {
    difficultyKey = "medium";
}

// This is the word length the rest of the code uses
var Difficulty = DifficultyMap[difficultyKey];
var DudLength = 8;
var Sound = true;
var InfoText = "ROBCO INDUSTRIES (TM) TERMALINK PROTOCOL<br />ENTER PASSWORD NOW";
var BootText = ""
    + "WELCOME TO ROBCO INDUSTRIES (TM) TERMLINK<br />"
    + "<br />"
    + ">SET TERMINAL/INQUIRE<br />"
    + "<br />"
    + "RIT-V300<br />"
    + "<br />"
    + ">SET FILE/PROTECTION=OWNER:RWED ACCOUNTS.F<br />"
    + ">SET HALT RESTART/MAINT<br />"
    + "<br />"
    + "Initializing Robco Industries(TM) MF Boot Agent v2.3.0<br />"
    + "RETROS BIOS<br />"
    + "RBIO-4.02.08.00 52EE5.E7.E8<br />"
    + "Copyright 2201-2203 Robco Ind.<br />"
    + "Uppermem: 64 KB<br />"
    + "Root (5A8)<br />"
    + "Maintenance Mode<br />"
    + "<br />"
    + ">RUN DEBUG/ACCOUNTS.F";

var Correct = "";
var Words = {};
var OutputLines = [];
var AttemptsRemaining = 4;
var Power = "off";
var BracketSets = [
	"<>",
	"[]",
	"{}",
	"()"
];
var gchars =
[
	"'",
	"|",
	"\"",
	"!",
	"@",
	"#",
	"$",
	"%",
	"^",
	"&",
	"*",
	"-",
	"_",
	"+",
	"=",
	".",
	";",
	":",
	"?",
	",",
	"/"
];
var TypeSoundMode = "all";
var SystemTypingAudio = null;
var DisplayingAudio = null;
var BootSequenceDone = false;
var AllowDisplayingSound = false;

$(document).ready(function() {
    SystemTypingAudio = document.getElementById("system-typing-sound");
});

function getDisplayingAudio() {
    if (!DisplayingAudio) {
        DisplayingAudio = document.getElementById("displaying-sound");
    }
    return DisplayingAudio;
}

function StartDisplayingSound() {
    // Only play if sound is enabled AND the current phase allows ambient sound
    if (!Sound || !AllowDisplayingSound) return;

    var audio = getDisplayingAudio();
    if (audio) {
        try {
            audio.currentTime = 0;
            audio.play();
        } catch (e) {
            // ignore autoplay issues silently (hopefully)
        }
    }
}


function StopDisplayingSound() {
    var audio = getDisplayingAudio();
    if (audio) {
        audio.pause();
        audio.currentTime = 0;
    }
}


function StartSystemTypingSound() {
    if (!Sound) return;
    if (SystemTypingAudio) {
        try {
            SystemTypingAudio.currentTime = 0;
            SystemTypingAudio.play();
        } catch (e) {
            // ignore autoplay restrictions silently
        }
    }
}

function StopSystemTypingSound() {
    if (SystemTypingAudio) {
        SystemTypingAudio.pause();
        SystemTypingAudio.currentTime = 0;
    }
}


Start = function()
{
    // Load words from local text file and build a fallout-style word list
    LoadWordsFromText(Difficulty, Count, function(jsonString) {
        // Call WordCallback exactly like the old PHP endpoint
        WordCallback(jsonString);
    });
}

// Load wordlist.txt, filter by length, and build a solvable list
function LoadWordsFromText(length, count, callback) {
    $.get("robco-industries/ajax/wordlist.txt", function(data) {

        // Split on whitespace to get candidate words
        var allWords = data.split(/\s+/);
        var candidates = [];

        allWords.forEach(function(w) {
            w = w.trim();
            if (w && w.length === length) {
                candidates.push(w.toLowerCase());
            }
        });

        if (candidates.length === 0) {
            // No candidates of this length – return empty structure
            callback(JSON.stringify({ words: [] }));
            return;
        }

        // Shuffle candidates for randomness
        shuffleArray(candidates);

        // Pick the correct word
        var correct = candidates[0];
        var result = [correct];

        var similar = [];
        var dissimilar = [];

        for (var i = 1; i < candidates.length; i++) {
            var w = candidates[i];
            var sim = positionalSimilarity(correct, w);
            if (sim > 0) {
                similar.push(w);     // shares at least one letter in same position
            } else {
                dissimilar.push(w);  // pure decoy
            }
        }

        var needed = count - 1;

        // First, take as many similar words as possible
        var similarCount = Math.min(needed, similar.length);
        for (var s = 0; s < similarCount; s++) {
            result.push(similar[s]);
        }

        // Fill remaining slots with dissimilar words
        var remaining = count - result.length;
        for (var d = 0; d < remaining && d < dissimilar.length; d++) {
            result.push(dissimilar[d]);
        }

        // If still short (tiny wordlist), pad with the correct word
        while (result.length < count) {
            result.push(correct);
        }

        // Pass JSON string to WordCallback to mimic the old PHP response
        callback(JSON.stringify({ words: result }));
    }, "text");
}

// Count letters that match in the same position
function positionalSimilarity(a, b) {
    if (a.length !== b.length) return 0;
    var matches = 0;
    for (var i = 0; i < a.length; i++) {
        if (a.charAt(i) === b.charAt(i)) {
            matches++;
        }
    }
    return matches;
}

// Fisher–Yates shuffle
function shuffleArray(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = arr[i];
        arr[i] = arr[j];
        arr[j] = tmp;
    }
}


$(window).on("load", function() {
	Initialize();
});
BeginHackGame = function()
{
    if (BootSequenceDone)
        return;

    BootSequenceDone = true;

	StopDisplayingSound();
	AllowDisplayingSound = false;

    // Stop boot typing
    var cont = $("#info");
    cont.stop(true, true);
    cont.html("");

    $(document).off(".bootskip");

    // Back to normal sound behavior for the rest of the game
    TypeSoundMode = "all";

    InfoText = "ROBCO INDUSTRIES (TM) TERMALINK PROTOCOL<br />ENTER PASSWORD NOW";
    $("#info").html(InfoText);

    WordColumnsWithDots();
    FillPointerColumns();
    SetupOutput();

    AttemptsRemaining = 4;
    UpdateAttempts();

    Start();
}


Initialize = function()
{
    if (Power == "off")
        return;
        
    if ($.browser.safari || $.browser.msie)
        Sound = false;
    document.onselectstart = function() { return false; }
    
    if (Sound)
        $("#poweron")[0].play();

    BootSequenceDone = false;
    PopulateScreen();

    // BOOT: only play sounds for prompt lines (starting with '>')
	TypeSoundMode = "prompt";

	// BOOT: allow ambient while the boot text is displaying
	AllowDisplayingSound = true;
	
	JTypeFillWithDisplayingSound("info", BootText, 15, function()
	{
		// Boot typing finished; disallow ambient for safety
		AllowDisplayingSound = false;
	
		setTimeout(function() {
			BeginHackGame();
		}, 1000);
	}, "", "");
	


    // Skip handlers
    setTimeout(function() {
        $(document).off(".bootskip").on("keydown.bootskip click.bootskip", function(e) {
            e.preventDefault();
            BeginHackGame();
        });
    }, 200);
}


WordColumnsWithDots = function()
{
	var column2 = $("#column2");
	var column4 = $("#column4");
	
	var dots = GenerateDotColumn();
	column2.html( dots );
	column4.html( dots );
}

PopulateScreen = function()
{
	$("#terminal").html('<div id="terminal-interior"><div id="info"></div><div id="attempts"></div><div id="column1" class="column pointers"></div><div id="column2" class="column words"></div><div id="column3" class="column pointers"></div><div id="column4" class="column words"></div><div id="output"></div><div id="console">></div></div>');
}

UpdateAttempts = function()
{
	var AttemptString = AttemptsRemaining + " ATTEMPT(S) LEFT: ";
	JTypeFill("attempts", AttemptString, 20, function(){
		var i = 0;
		while (i < AttemptsRemaining)
		{
			AttemptString += " &#9608;";
			i++;
		}
		$("#attempts").html( AttemptString);
	}, "", "");
}

TogglePower = function()
{
	if (Power == "on")
	{
		Power = "off";

		StopDisplayingSound();
		AllowDisplayingSound = false;

		$("#terminal-background-off").css("visibility", "visible");
		$("#terminal").css("background-image", "url('robco-industries/img/bg-off.png')");
		$("#terminal").html("");
		if (Sound)
			$("#poweroff")[0].play();
	}
	else
	{
		Power = "on";
		$("#terminal-background-off").css("visibility", "hidden");
		$("#terminal").css("background-image", "url('robco-industries/img/bg.png')");
		Initialize();
	}
}

function ShouldPlayTypeSound(text, charIndex) {
    if (!Sound) return false;
    if (TypeSoundMode === "none") return false;
    if (TypeSoundMode === "all") return true;

    if (TypeSoundMode === "prompt") {
        if (charIndex < 0) return false;

        // Look at all text up to and including this character
        var upToChar = text.substr(0, charIndex + 1);

        // Find the start of the current "line" by last <br />
        var lastBreak = upToChar.lastIndexOf("<br />");
        var lineStart = lastBreak >= 0 ? lastBreak + 6 : 0; // "<br />".length = 6
        var line = upToChar.substr(lineStart);

        // Ignore leading whitespace
        line = line.replace(/^\s+/, "");

        // If the line starts with '>', treat it as "player input" for audio
        return line.charAt(0) === ">";
    }

    return false;
}


JTypeFill = function(containerID, text, TypeSpeed, callback, TypeCharacter, Prefix)
{
	var cont = $("#" + containerID);
	
	if (typeof TypeCharacter == 'undefined' || TypeCharacter == null)
		TypeCharacter = "&#9608;";
	
	if (typeof Prefix == 'undefined' || Prefix == null)
		Prefix = ">";
	
	cont.html("").stop().css("fake-property", 0).animate(
	{
		"fake-property" : text.length
	},
		{
			duration: TypeSpeed * text.length,
			step: function(i)
            {
                var iRound = Math.round(i);
                var insert = Prefix + text.substr(0, iRound);

                // Only play a key sound if the visible text actually changed
                // AND thee ShouldPlayTypeSound logic says it should
				if (cont.text().substr(0, cont.text().length - 1 ) != insert)
				{
					if (ShouldPlayTypeSound(text, iRound - 1)) {
						var keySounds = $("#audiostuff").find("audio").not("#displaying-sound");
						if (keySounds.length) {
							keySounds.eq(Math.floor(Math.random() * keySounds.length))[0].play();
						}
					}
				}
				

                cont.html(insert + TypeCharacter);
            },
			complete: callback
		}
	);
}

function JTypeFillWithDisplayingSound(containerID, text, TypeSpeed, callback, TypeCharacter, Prefix) {
    StartDisplayingSound();

    JTypeFill(containerID, text, TypeSpeed, function() {
        StopDisplayingSound();

        if (typeof callback === "function") {
            callback();
        }
    }, TypeCharacter, Prefix);
}

WordCallback = function(Response)
{
	Words = JSON.parse(Response).words;
	Correct = Words[0];
	Words = Shuffle(Words);
	FillWordColumns();
}

SetupInteractions = function(column)
{
	column = $(column);
	
	column.find(".character").hover(function()
	{
		if (AttemptsRemaining == 0)
			return false;
			
		$(this).addClass("character-hover");
		
		
		
		if ( !$(this).hasClass("word") && !$(this).hasClass("dudcap") )
		{
			UpdateConsole($(this).text());
			return true;
		}
		
		if ($(this).hasClass("word"))
			UpdateConsole($(this).attr("data-word"));
		else if ($(this).hasClass("dudcap"))
			UpdateConsole($(this).text());
		
		var cur = $(this).prev();
		if (cur.is("br"))
				cur = cur.prev();
		while (cur.hasClass("word") || cur.hasClass("dud"))
		{
			cur.addClass("character-hover");
			cur = cur.prev();
			if (cur.is("br"))
				cur = cur.prev();
		}
		
		var cur = $(this).next();
		if (cur.is("br"))
				cur = cur.next();
		while (cur.hasClass("word") || cur.hasClass("dud"))
		{
			cur.addClass("character-hover");
			cur = cur.next();
			if (cur.is("br"))
				cur = cur.next();
		}
		
	},
	function()
	{
			
		$(this).removeClass("character-hover");
		
		if ( !$(this).hasClass("word") && !$(this).hasClass("dudcap") )
			return true;
		
		var cur = $(this).prev();
		if (cur.is("br"))
				cur = cur.prev();
		while (cur.hasClass("word") || cur.hasClass("dud"))
		{

			cur.removeClass("character-hover");
			cur = cur.prev();
			if (cur.is("br"))
				cur = cur.prev();
		}
		
		var cur = $(this).next();
		if (cur.is("br"))
				cur = cur.next();
		while (cur.hasClass("word") || cur.hasClass("dud"))
		{
			cur.removeClass("character-hover");
			cur = cur.next();
			if (cur.is("br"))
				cur = cur.next();
		}
	});
	
	column.find(".character").click(function()
	{
		if (AttemptsRemaining == 0)
			return false;
			
		var word;
		if ($(this).hasClass("word"))
		{
			if (Sound)
				$("#enter")[0].play();
			word = $(this).attr("data-word");
			UpdateOutput(word);
			
			if (word.toLowerCase() == Correct.toLowerCase())
			{
				if (Sound)
					$("#passgood")[0].play();
				UpdateOutput("");
				UpdateOutput("Exact match!");
				UpdateOutput("Please wait");
				UpdateOutput("while system");
				UpdateOutput("is accessed.");
				AttemptsRemaining = 0;
				Success();
			}
			else
			{
				if (Sound)
					$("#passbad")[0].play();
				UpdateOutput("Access denied");
				UpdateOutput( CompareWords(word, Correct) + "/" + Correct.length + " correct." );
				AttemptsRemaining--;
				UpdateAttempts();
				if (AttemptsRemaining == 0)
					Failure();
			}
		}
		else if ($(this).hasClass("dudcap"))
		{
			if (Sound)
				$("#enter")[0].play();
			HandleBraces( $(this) );
		}
		else
		{
			return false;
		}
	});
}

RemoveDud = function()
{
	var LiveWords = $(".word").not("[data-word='" + Correct.toUpperCase() + "']");
	
	var WordToRemove = $( LiveWords[ Math.floor( Math.random() * LiveWords.length) ] ).attr("data-word");
	
	$("[data-word='" + WordToRemove + "']").each(function(index, elem)
	{
		$(this).text(".").removeClass("word").removeAttr("data-word");
	});
}

HandleBraces = function(DudCap)
{
	if ( Math.round( Math.random() - .3 ) )
	{
		AttemptsRemaining = 4;
		UpdateOutput("");
		UpdateOutput("Allowance");
		UpdateOutput("replenished.");
		UpdateAttempts();
	}
	else
	{
		UpdateOutput("");
		UpdateOutput("Dud removed.");
		RemoveDud();
	}
	
	$(DudCap).text(".").unbind("click");
		var cur = $(DudCap).next();
		if (cur.is("br"))
				cur = cur.next();
		while ( cur.hasClass("dud") )
		{
			if ( cur.hasClass("dudcap") )
			{
				cur.text(".").removeClass("dudcap").unbind("click");
			}
			else
			{
				cur.text(".").unbind("click");
			}
			cur = cur.next();
			if (cur.is("br"))
				cur = cur.next();
		}
		
		var cur = $(DudCap).prev();
		if (cur.is("br"))
				cur = cur.prev();
		while ( cur.hasClass("dud") )
		{
			if ( cur.hasClass("dudcap") )
			{
				cur.text(".").removeClass("dudcap").unbind("click");
			}
			else
			{
				cur.text(".").unbind("click");
			}
			cur = cur.prev();
			if (cur.is("br"))
				cur = cur.prev();
		}
}

Failure = function()
{
    // Final deny message in the current game output
	StopDisplayingSound();
	AllowDisplayingSound = false;

    UpdateOutput("Access denied.");
    AttemptsRemaining = 0;
    UpdateAttempts();

    // Slide the current terminal interior up like the success screen did
    $("#terminal-interior").animate({
        top: -1 * $("#terminal-interior").height()
    },
    {
        duration: 1000,
        complete : function()
        {
            // Replace the terminal contents with a lockout screen
            $("#terminal").html(
                "<div id='lockout-screen'>" +
                    "<div id='lockout-message'>" +
                        "<div>TERMINAL LOCKED</div>" +
                        "<div>PLEASE CONTACT AN ADMINISTRATOR</div>" +
                    "</div>" +
                "</div>"
            );
        }
    });
}


Success = function()
{
    AttemptsRemaining = 0;
    UpdateAttempts();

    UpdateOutput("Access granted.");

    var asterisks = Array(Difficulty + 1).join("* ");

    $("#terminal-interior").animate({
        top: -1 * $("#terminal-interior").height()
    },
    {
        duration: 1000,
        complete : function()
        {
			$("#terminal").html(
				"<div id='success-screen'>" +
					"<div id='success-header'></div>" +
					"<div id='success-body'></div>" +
				"</div>"
			);
			
			// SUCCESS: allow ambient during header + body typing
			AllowDisplayingSound = true;
			
			// 1) Type header with displaying1, but no keyclicks
			TypeSoundMode = "none";
			JTypeFillWithDisplayingSound(
				"success-header",
				"WELCOME TO ROBCO INDUSTRIES (TM) TERMLINK",
				20,
				function() {
					// 2) Type the body with displaying1 + prompt-only key clicks
					TypeSoundMode = "prompt";
			
					var bodyText =
						"> LOGON ADMIN<br /><br />" +
						"ENTER PASSWORD NOW<br /><br />" +
						"> " + asterisks;
			
					JTypeFillWithDisplayingSound(
						"success-body",
						bodyText,
						20,
						function() {
							// Done with success typing; stop ambient PLEASEEE
							TypeSoundMode = "all";
							AllowDisplayingSound = false;
						},
						"",
						""
					);
				},
				"",
				""
			);			
        }
    });
}


CompareWords = function(first, second)
{
	if (first.length !== second.length)
	{
		return 0;
	}
	
	first = first.toLowerCase();
	second = second.toLowerCase();
	
	var correct = 0;
	var i = 0;
	while (i < first.length)
	{
		if (first[i] == second[i])
			correct++;
		i++;
	}
	return correct;
}

UpdateConsole = function(word)
{
    var cont = $("#console");
    var TypeSpeed = 80;

    cont.html("").stop().css("fake-property", 0).animate(
    {
        "fake-property" : word.length
    },
    {
        duration: TypeSpeed * word.length,
        step: function(i)
        {
            var iRound = Math.round(i);
            var insert = ">" + word.substr(0, iRound);

            // Only play a keyclick if the visible text is changing
            if (cont.text().substr(0, cont.text().length - 1 ) != insert)
            {
                if (Sound)
                {
                    // FIX: exclude displaying-sound from random pool
                    var keySounds = $("#audiostuff").find("audio").not("#displaying-sound");

                    if (keySounds.length)
                    {
                        keySounds
                            .eq(Math.floor(Math.random() * keySounds.length))[0]
                            .play();
                    }
                }
            }

            cont.html(insert + "&#9608;");
        }
    });
}


UpdateOutput = function(text)
{
	OutputLines.push(">" + text);
	
	var output = "";
	
	var i = columnHeight - 2;
	while (i > 0)
	{
		output += OutputLines[ OutputLines.length - i ] + "<br />";
		i--;
	}
	
	$("#output").html(output);
}

PopulateInfo = function()
{
	var cont = $("#info");
	
	var curHtml = "";
	
	var TypeSpeed = 20;

	cont.stop().css("fake-property", 0).animate(
		{
			"fake-property" : InfoText.length
		},
		{
			duration: TypeSpeed * InfoText.length,
			step: function(delta)
			{
				var insert = InfoText.substr(0, delta);
				delta = Math.round(delta);
				if (cont.html().substr(0, cont.html().length - 1 ) != insert)
				{
					$("#audiostuff").find("audio").eq( Math.floor(Math.random() * $("#audiostuff").find("audio").length) )[0].play();
				}
				cont.html(insert);
			}
		}
	);
}

SetupOutput = function()
{
	var i = 0;
	while (i < columnHeight)
	{
		OutputLines.push("");
		i++;
	}
}

FillPointerColumns = function()
{
	var column1 = document.getElementById("column1");
	var column3 = document.getElementById("column3");
	
	var pointers = "";
	
	var i = 0;
	while ( i < columnHeight )
	{
		pointers += RandomPointer() + "<br />";
		i++;
	}
	
	column1.innerHTML = pointers;
	
	pointers = "";
	
	var i = 0;
	while ( i < columnHeight )
	{
		pointers += RandomPointer() + "<br />";
		i++;
	}
	
	column3.innerHTML = pointers;
}

FillWordColumns = function()
{
	var column2 = document.getElementById("column2");
	var column4 = document.getElementById("column4");
	
	var column2Content = $(GenerateGarbageCharacters());
	var column4Content = $(GenerateGarbageCharacters());
	
	var WordsPerColumn = Words.length;
	
	// Fill the first column
	
	var AllChars = column2Content;
	
	var start = Math.floor(Math.random() * wordColumnWidth);
	var i = 0;
	while (i < Words.length / 2)
	{
		var pos = start + i * Math.floor(AllChars.length / (Words.length / 2));
		for (var s = 0; s < Difficulty; s++)
		{
			var word = Words[i].toUpperCase();
			$(AllChars[pos + s]).addClass("word").text(word[s]).attr("data-word", word);
		}
		i++;
	}
	
	AllChars = AddDudBrackets(AllChars);
	//console.log( AllBlanks );
	
	PrintWordsAndShit( column2, AllChars );
	
	// Fill the second, for loop later
	
	AllChars = column4Content;
	
	start = Math.floor(Math.random() * wordColumnWidth);
	i = 0;
	while (i < Words.length / 2)
	{
		var pos = start + i * Math.floor(AllChars.length / (Words.length / 2));
		for (var s = 0; s < Difficulty; s++)
		{
			var word = Words[i + Words.length / 2].toUpperCase();
			$(AllChars[pos + s]).addClass("word").text(word[s]).attr("data-word", word);
		}
		i++;
	}
	AllChars = AddDudBrackets(AllChars);
	PrintWordsAndShit( column4, AllChars );
}

AddDudBrackets = function(Nodes)
{
	var AllBlankIndices = GetContinuousBlanks(Nodes);
	
	
	var i = 1;
	while (i < AllBlankIndices.length)
	{
		if (Math.round( Math.random() + .25 ) )
		{
			var Brackets = BracketSets[ Math.floor( Math.random() * BracketSets.length ) ];
			var ChunkCenter = Math.floor( AllBlankIndices[i].length / 2 );
			var j = ChunkCenter - DudLength / 2;
			while (j < ChunkCenter + DudLength / 2)
			{
				if (j == ChunkCenter - DudLength / 2)
					$( Nodes[ AllBlankIndices[i][ j ] ] ).text( Brackets[0] ).addClass("dudcap");
				else if (j == ChunkCenter + DudLength / 2 - 1)
					$( Nodes[ AllBlankIndices[i][ j ] ] ).text( Brackets[1] ).addClass("dudcap");
				
				$( Nodes[ AllBlankIndices[i][ j ] ] ).addClass("dud");
				
				j++;
			}
		}
		i++;
	}
	
	return Nodes;
}

GetContinuousBlanks = function(Nodes)
{
	var AllNodes = $( Nodes );
	var ContinuousBlanks = [[]];
	var cur = 0;
	$.each(AllNodes, function(index, elem)
	{
		if ( !$(elem).hasClass("word") )
		{
			ContinuousBlanks[cur].push( index );
		
			if (index + 1 != AllNodes.length)
			{
				if ( $(AllNodes[index + 1]).hasClass("word") )
				{
					ContinuousBlanks.push([]);
					cur++;
				}
			}
		}
	});
	return ContinuousBlanks;
}

PrintWordsAndShit = function(container, words)
{
	Nodes = $(container).find(".character");
	Nodes.each(function(index, elem)
	{
		$(elem).delay(5 * index).queue(function()
		{
			$(elem).replaceWith( words[index] );
			if (index == Nodes.length - 1)
			{
				SetupInteractions(container);
			}
		});
	});
}

Shuffle = function(array)
{
	var tmp, current, top = array.length;
	if(top) while(--top)
	{
		current = Math.floor(Math.random() * (top + 1));
		tmp = array[current];
		array[current] = array[top];
		array[top] = tmp;
	}
	return array;
}

GenerateDotColumn = function()
{
	var dots = "";
	
	var x = 0;
	var y = 0;
	while (y < columnHeight)
	{
		while (x < wordColumnWidth)
		{	
			dots += "<span class='character'>.</span>";
			x++;
		}
		dots += "<br />";
		x = 0;
		y++;
	}
	
	return dots;
}

GenerateGarbageCharacters = function()
{
	var garbage = "";
	
	var x = 0;
	var y = 0;
	while (y < columnHeight)
	{
		while (x < wordColumnWidth)
		{	
			garbage += "<span class='character'>" + gchars[ Math.floor( Math.random() * gchars.length ) ] + "</span>";
			x++;
		}
		//garbage += "<br />";
		x = 0;
		y++;
	}
	
	return garbage;
}

RandomPointer = function()
{
	if (Sound)
		return "0x" + (("0000" + Math.floor( Math.random() * 35535 ).toString(16).toUpperCase()).substr(-4));
	else
	{
		var butt = (("0000" + Math.floor( Math.random() * 35535 ).toString(16).toUpperCase()));
		return "0x" + butt.slice(butt.length - 4, butt.length); 
	}				
}
