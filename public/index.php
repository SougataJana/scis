<?php
declare(strict_types=1);

require __DIR__ . '/../src/compat.php';
require __DIR__ . '/../src/Abstracts.php';
require __DIR__ . '/../src/Programme.php';

use Scis\Programme;

$root = dirname(__DIR__);

// Event facts (from the official poster)
$event = [
    'short'     => 'SC&IS 25',
    'school'    => 'School of Computational and Integrative Sciences',
    'university'=> 'Jawaharlal Nehru University, New Delhi',
    'title'     => 'SC&IS Silver Jubilee Symposium',
    'theme'     => 'Computational Science Across Scales',
    'start'     => '2026-11-27T09:00:00+05:30',
    'abstract_deadline'     => '2026-11-15T23:59:00+05:30',
    'registration_deadline' => '2026-11-20T23:59:00+05:30',
    'register_url' => 'https://tinyurl.com/scis25jnu',
    'map_url'   => 'https://www.google.com/maps/search/?api=1&query=' . rawurlencode('School of Computational and Integrative Sciences, Jawaharlal Nehru University, New Delhi 110067'),
    'saa_map_url' => 'https://www.google.com/maps/search/?api=1&query=' . rawurlencode('Jawaharlal Nehru University, New Delhi 110067'),
    'fee_student' => '₹1,000',
    'fee_other'   => '₹2,000',
];

// Patrons and organisers (shown with photos in Details → Who).
$people = [
    ['key' => 'chief-patron', 'role' => 'Chief Patron', 'name' => 'Prof. Santishree Dhulipudi Pandit', 'sub' => 'Vice-Chancellor, JNU', 'initials' => 'SP'],
    ['key' => 'patron',       'role' => 'Patron',       'name' => 'Prof. R. K. Brojen Singh',           'sub' => 'Dean, SC&IS, JNU',     'initials' => 'BS'],
    ['key' => 'convenor',     'role' => 'Convenor',     'name' => 'Ragothaman Yennamalli',              'sub' => 'SC&IS, JNU',           'initials' => 'RY'],
    ['key' => 'co-convenor',  'role' => 'Co-convenor',  'name' => 'Arnab Bhattacharjee',                'sub' => 'SC&IS, JNU',           'initials' => 'AB'],
];
// A photo shows automatically when public/assets/img/<key>.jpg (or .png / .webp) exists; otherwise initials are shown.
foreach ($people as &$pp) {
    $pp['photo'] = '';
    foreach (['jpg', 'png', 'webp'] as $ext) if (is_file(__DIR__ . "/assets/img/{$pp['key']}.$ext")) { $pp['photo'] = "{$pp['key']}.$ext"; break; }
}
unset($pp);
$contacts = [
    ['role' => 'Convenor',    'name' => 'Ragothaman Yennamalli', 'email' => 'ragothaman@jnu.ac.in'],
    ['role' => 'Co-convenor', 'name' => 'Arnab Bhattacharjee',   'email' => 'arnab@jnu.ac.in'],
];
// Footer credit
$credit = ['name' => 'Sougata Jana', 'url' => 'https://github.com/SougataJana', 'email' => 'sougataj1@gmail.com'];

$sessions = Programme::sessions();
$days     = Programme::days();
$speakers = Programme::speakers();
$programmeJson = json_encode(
    array_map(static fn($s) => $s->toArray(), $sessions),
    JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP | JSON_THROW_ON_ERROR
);

$asset = static fn(string $p): string => 'assets/' . $p . '?v=' . (string) @filemtime(__DIR__ . '/assets/' . $p);
?>
<!doctype html>
<html lang="en" class="no-intro">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title><?= e($event['title']) ?> · JNU · 27–28 Nov 2026</title>
<meta name="description" content="<?= e($event['theme']) ?> — 25 years of the School of Computational and Integrative Sciences, JNU. 27–28 November 2026.">
<meta name="theme-color" content="#02080d">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Ccircle cx='16' cy='16' r='15' fill='%2302080d' stroke='%235fe3f0' stroke-width='2'/%3E%3Ctext x='16' y='21' text-anchor='middle' font-size='13' font-weight='700' fill='%235fe3f0' font-family='sans-serif'%3E25%3C/text%3E%3C/svg%3E">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<script type="importmap">{"imports":{"three":"./assets/js/vendor/three/three.module.js","three/addons/":"./assets/js/vendor/three/addons/"}}</script>
<link rel="modulepreload" href="./assets/js/vendor/three/three.module.js">
<link rel="modulepreload" href="<?= e($asset('js/gl/stage.js')) ?>">
<link rel="stylesheet" href="<?= e($asset('css/site.css')) ?>">
</head>
<body>
<div class="loader" id="loader" aria-hidden="true"><svg viewBox="0 0 80 80" width="84" height="84"><circle cx="40" cy="40" r="34" fill="none" stroke="rgba(95,227,240,.16)" stroke-width="2"/><circle class="loader-arc" cx="40" cy="40" r="34" fill="none" stroke="#5fe3f0" stroke-width="2" stroke-linecap="round" stroke-dasharray="60 154"/><text x="40" y="49" text-anchor="middle" font-size="26" font-weight="700" fill="#eaf8fb" font-family="Space Grotesk, sans-serif">25</text></svg><p>SC&amp;IS · JNU</p></div>
<canvas id="stage" aria-hidden="true"></canvas>
<div class="vignette" aria-hidden="true"></div>
<canvas id="fx" aria-hidden="true"></canvas>
<div class="scrollbar" aria-hidden="true"><i></i></div>
<nav class="rail" id="rail" aria-label="Page sections"></nav>

<?php require $root . '/views/nav.php'; ?>
<main id="top">
<?php
require $root . '/views/hero.php';
require $root . '/views/about.php';
require $root . '/views/glance.php';
require $root . '/views/programme.php';
require $root . '/views/contact.php';
require $root . '/views/register.php';
?>
</main>
<?php require $root . '/views/footer.php'; ?>

<div id="sheet" class="sheet" data-lenis-prevent hidden role="dialog" aria-modal="true" aria-labelledby="sheetTitle">
  <canvas id="sheetCanvas" aria-hidden="true"></canvas>
  <div class="sheet-body">
    <button class="sheet-close btn ghost" type="button" aria-label="Close session">Close <span aria-hidden="true">✕</span></button>
    <p class="sheet-kicker" id="sheetKicker"></p>
    <h3 class="sheet-title" id="sheetTitle"></h3>
    <p class="sheet-meta" id="sheetMeta"></p>
    <ul class="sheet-talks" id="sheetTalks"></ul>
    <div class="sheet-abstract" id="sheetAbstract" hidden>
      <button class="sheet-back" type="button">&larr; <span id="sheetBackLabel">Back to talks</span></button>
      <div class="abs-speaker" id="absSpeaker">
        <span class="avatar" id="absAvatar"><b id="absInitials"></b><u></u></span>
        <div><strong id="absName"></strong><small id="absAff"></small></div>
      </div>
      <p class="abs-time" id="absTime"></p>
      <h4 class="abs-title" id="absTitle"></h4>
      <p class="abs-authors" id="absAuthors" hidden></p>
      <div class="abs-body" id="absBody"></div>
      <div class="abs-refs" id="absRefs" hidden></div>
    </div>
  </div>
</div>

<script type="application/json" id="programme-data"><?= $programmeJson ?></script>
<script>window.SCIS = <?= json_encode([
    'start' => $event['start'],
    'abstract' => $event['abstract_deadline'],
    'registration' => $event['registration_deadline'],
    // just the cache-busting token: the dynamic import() in app.js needs a specifier
    // relative to its OWN location (./gl/stage.js), not one relative to the document
    // root like asset() returns — those are different base paths once app.js isn't
    // sitting at the document root itself.
    'stageV' => (string) @filemtime(__DIR__ . '/assets/js/gl/stage.js'),
], JSON_HEX_TAG | JSON_HEX_AMP | JSON_THROW_ON_ERROR) ?>;</script>
<script src="<?= e($asset('js/fx.js')) ?>" defer></script>
<script type="module" src="<?= e($asset('js/app.js')) ?>"></script>
</body>
</html>
