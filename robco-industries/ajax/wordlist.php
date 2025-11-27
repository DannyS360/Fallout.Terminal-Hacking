<?php
$wordsRaw = @file_get_contents('wordlist.txt');

if ($wordsRaw === FALSE || !isset($_GET['length']) || !isset($_GET['count'])) {
    echo "{}";
    exit();
}

$length = (int) $_GET['length'];
$count  = (int) $_GET['count'];

if ($length <= 0 || $count <= 0) {
    echo "{}";
    exit();
}

// Split the words by spaces
$allWords = explode(" ", $wordsRaw);

// Filter words to requested length
$candidates = array();
foreach ($allWords as $w) {
    $w = trim($w);
    if ($w !== "" && strlen($w) === $length) {
        $candidates[] = strtolower($w);
    }
}

// If no candidates, bail
if (count($candidates) === 0) {
    echo "{}";
    exit();
}

// Helper: count letters matching in the same position
function positional_similarity($a, $b) {
    $len = strlen($a);
    if ($len !== strlen($b)) return 0;
    $matches = 0;
    for ($i = 0; $i < $len; $i++) {
        if ($a[$i] === $b[$i]) {
            $matches++;
        }
    }
    return $matches;
}

// Shuffle for randomness
shuffle($candidates);

// Pick the correct word
$correct = $candidates[0];
$result  = array($correct);

// Split the rest into similar/dissimilar pools
$similar    = array();
$dissimilar = array();

for ($i = 1; $i < count($candidates); $i++) {
    $w = $candidates[$i];
    $sim = positional_similarity($correct, $w);
    if ($sim > 0) {
        $similar[] = $w;        // shares at least one letter in same position
    } else {
        $dissimilar[] = $w;     // pure decoy
    }
}

// We want $count - 1 additional words
$needed = $count - 1;

// Take from similar pool first
$similarCount = min($needed, count($similar));
for ($i = 0; $i < $similarCount; $i++) {
    $result[] = $similar[$i];
}

// Fill remaining slots from dissimilar pool
$remaining = $count - count($result);
for ($i = 0; $i < $remaining && $i < count($dissimilar); $i++) {
    $result[] = $dissimilar[$i];
}

// If still short (tiny wordlist), pad with the correct word
while (count($result) < $count) {
    $result[] = $correct;
}

// Return JSON exactly as terminal.js expects
echo json_encode(array("words" => $result));
?>
