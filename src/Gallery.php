<?php
declare(strict_types=1);

namespace Scis;

/** One photo in the gallery. */
final readonly class Photo
{
    public function __construct(
        public string $src,
        public int $width,
        public int $height,
        public string $caption,
        public string $album,
    ) {}
}

/**
 * Reads /public/gallery. Loose files form the "All" set; every sub-folder is an album
 * (e.g. gallery/2019-reunion/*.jpg). Optional gallery/captions.json maps a file name
 * (or "folder/file") to a caption. Nothing to configure — drop photos in and reload.
 */
final class Gallery
{
    private const array EXT = ['jpg', 'jpeg', 'png', 'webp', 'avif', 'gif'];
    private const int MAX = 160;

    /** @return list<Photo> */
    public static function photos(string $dir, string $urlBase = 'gallery'): array
    {
        if (!is_dir($dir)) {
            return [];
        }
        $captions = [];
        if (is_file($dir . '/captions.json')) {
            $decoded = json_decode((string) file_get_contents($dir . '/captions.json'), true);
            $captions = is_array($decoded) ? $decoded : [];
        }

        $found = [];
        $walk = static function (string $path, string $album) use (&$walk, &$found, $dir): void {
            $entries = scandir($path) ?: [];
            natcasesort($entries);
            foreach ($entries as $f) {
                if ($f[0] === '.') {
                    continue;
                }
                $full = $path . '/' . $f;
                if (is_dir($full) && $album === '') {
                    $walk($full, self::pretty($f));
                } elseif (is_file($full) && in_array(strtolower(pathinfo($f, PATHINFO_EXTENSION)), self::EXT, true)) {
                    $found[] = [$full, $album];
                }
            }
        };
        $walk($dir, '');

        $out = [];
        foreach (array_slice($found, 0, self::MAX) as [$full, $album]) {
            $info = @getimagesize($full);
            $rel  = ltrim(substr($full, strlen($dir)), '/');
            $name = pathinfo($full, PATHINFO_FILENAME);
            $out[] = new Photo(
                src: $urlBase . '/' . implode('/', array_map('rawurlencode', explode('/', $rel))),
                width: $info[0] ?? 4,
                height: $info[1] ?? 3,
                caption: (string) ($captions[$rel] ?? $captions[basename($rel)] ?? self::pretty($name)),
                album: $album,
            );
        }
        return $out;
    }

    /** @param list<Photo> $photos @return list<string> */
    public static function albums(array $photos): array
    {
        return array_values(array_unique(array_filter(array_map(static fn(Photo $p) => $p->album, $photos))));
    }

    private static function pretty(string $s): string
    {
        $s = preg_replace('/^\d+[-_ ]+/', '', $s) ?? $s;
        return ucfirst(trim(preg_replace('/[-_]+/', ' ', $s) ?? $s));
    }
}
