<?php
declare(strict_types=1);
/* Static export for GitHub Pages / Netlify / any static host:  php build-static.php  → ./dist */
$root = __DIR__; $dist = $root . '/dist';
function rrmdir(string $d): void { if (!is_dir($d)) return; foreach (scandir($d) as $f) { if ($f === '.' || $f === '..') continue; $p = "$d/$f"; is_dir($p) ? rrmdir($p) : unlink($p); } rmdir($d); }
function rcopy(string $a, string $b): void { @mkdir($b, 0777, true); foreach (scandir($a) as $f) { if ($f === '.' || $f === '..') continue; is_dir("$a/$f") ? rcopy("$a/$f", "$b/$f") : copy("$a/$f", "$b/$f"); } }
rrmdir($dist); mkdir($dist, 0777, true);
chdir($root . '/public');
ob_start(); require $root . '/public/index.php'; $html = ob_get_clean();
file_put_contents("$dist/index.html", $html);
foreach (['assets'] as $d) if (is_dir("$root/public/$d")) rcopy("$root/public/$d", "$dist/$d");
file_put_contents("$dist/.nojekyll", '');
echo "Built " . strlen($html) . " bytes → dist/\n";
