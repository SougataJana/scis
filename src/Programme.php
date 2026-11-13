<?php
declare(strict_types=1);

namespace Scis;

final readonly class Talk
{
    public function __construct(
        public string $time,
        public string $speaker,
        public string $affiliation,
        public string $slot,       // e.g. "25 + 5 min"
        public bool $keynote,      // 25+5 slots = keynote speakers on the poster
        public ?string $title = null,     // the talk's own title, once speakers confirm it
        public ?string $abstract = null,  // full abstract text, once submitted
        public ?string $authors = null,   // co-author line, only when the abstract was sent with one
    ) {}

    public function initials(): string
    {
        $name = trim(preg_replace('/^Dr\.?\s+/', '', $this->speaker) ?? $this->speaker);
        $parts = preg_split('/\s+/', $name) ?: [];
        $first = mb_substr($parts[0] ?? '', 0, 1);
        $last  = mb_substr($parts[count($parts) - 1] ?? '', 0, 1);
        return mb_strtoupper($first . $last);
    }

    public function toArray(): array
    {
        return [
            'time' => $this->time, 'speaker' => $this->speaker, 'affiliation' => $this->affiliation,
            'slot' => $this->slot, 'keynote' => $this->keynote, 'initials' => $this->initials(),
            'title' => $this->title, 'abstract' => $this->abstract, 'authors' => $this->authors,
        ];
    }
}

final readonly class Session
{
    /** @param list<Talk> $talks */
    public function __construct(
        public string $id,
        public int $number,
        public string $title,
        public string $time,
        public string $chairs,
        public string $venue,
        public int $hue,
        public string $blurb,
        public array $talks,
    ) {}

    public function toArray(): array
    {
        return [
            'id' => $this->id, 'number' => $this->number, 'title' => $this->title, 'time' => $this->time,
            'chairs' => $this->chairs, 'venue' => $this->venue, 'hue' => $this->hue, 'blurb' => $this->blurb,
            'talks' => array_map(static fn(Talk $t) => $t->toArray(), $this->talks),
        ];
    }
}

final class Programme
{
    private const string D1_VENUE = 'Auditorium, JNU';
    private const string D2_VENUE = 'Auditorium, JNU';

    private static function talk(string $time, string $who, string $aff, bool $short = false): Talk
    {
        $a = Abstracts::for($who);   // src/Abstracts.php — filled in as speakers send theirs
        return new Talk($time, $who, $aff, $short ? '12 + 3 min' : '25 + 5 min', !$short, $a['title'] ?? null, $a['abstract'] ?? null, $a['authors'] ?? null);
    }

    /** @return list<Session> */
    public static function sessions(): array
    {
        static $cache = null;
        if ($cache !== null) {
            return $cache;
        }

        return $cache = [
            new Session('s1', 1, 'Omics Science', '09:50 – 11:20', 'Dr. A. Krishnamachari & Dr. Pallavi Somvanshi', self::D1_VENUE, 175,
                'Reading life at genome scale — single-cell, CRISPR and regulatory omics.', [
                self::talk('09:50 – 10:20', 'Dr. Nagaraj Balasubramanian', 'IISER Pune'),
                self::talk('10:20 – 10:50', 'Dr. Debojyoti Chakraborty', 'CSIR-IGIB'),
                self::talk('10:50 – 11:20', 'Dr. Sumeet Pal Singh', 'SNU'),
            ]),
            new Session('s2', 2, 'Structural Biology and Drug Discovery', '11:50 – 13:20', 'Dr. Ragothaman Yennamalli & Dr. Andrew M. Lynn', self::D1_VENUE, 22,
                'From atomic structure to molecules that bind, block and heal.', [
                self::talk('11:50 – 12:20', 'Dr. Aditya Padhi', 'IIT BHU'),
                self::talk('12:20 – 12:50', 'Dr. Sourav Chatterjee', 'Ashoka University'),
                self::talk('12:50 – 13:05', 'Dr. Manish Kumar', 'DU South Campus', true),
                self::talk('13:05 – 13:20', 'Dr. Sabeeha Hasnain', 'Mahindra University', true),
            ]),
            new Session('s3', 3, 'Mathematical Biology and Statistical Modelling', '14:20 – 15:50', 'Dr. Sapna Ratan Shah, Dr. Kunwer Singh Mathur & Dr. Narinder Singh Sahni', self::D1_VENUE, 268,
                'Equations, dynamics and inference that turn measurements into mechanism.', [
                self::talk('14:20 – 14:50', 'Dr. Rashmi Bhardwaj', 'GGSIPU'),
                self::talk('14:50 – 15:20', 'Dr. Manish Dev Shrimali', 'Central University of Rajasthan'),
                self::talk('15:20 – 15:35', 'Dr. Kuldeep Singh Yadav', 'MANIT Bhopal', true),
                self::talk('15:35 – 15:50', 'Dr. Rahul Gupta', 'University of Bristol', true),
            ]),
            new Session('s4', 4, 'Artificial Intelligence in Computational Biology', '16:20 – 18:05', 'Dr. Shandar Ahmad, Dr. Rakesh Pandey & Dr. Jyoti Singh Kirar', self::D1_VENUE, 198,
                'Learning from biological data — models that predict, design and explain.', [
                self::talk('16:20 – 16:50', 'Dr. Vivek Tiwari', 'IISER Berhampur'),
                self::talk('16:50 – 17:20', 'Dr. Tavpritesh Sethi', 'IIIT Delhi'),
                self::talk('17:20 – 17:50', 'Dr. S. Senthil Kumaran', 'AIIMS, New Delhi'),
                self::talk('17:50 – 18:05', 'Dr. Neha Vinayak', 'BITS Pilani', true),
            ]),
            new Session('s5', 5, 'Plant Bioinformatics', '09:30 – 11:15', 'Dr. Mukesh Jain & Dr. Abinaya Manivannan', self::D2_VENUE, 132,
                'Genomes, stress and function across the plant kingdom.', [
                self::talk('09:30 – 10:00', 'Dr. Saurabh Raghuvanshi', 'DU'),
                self::talk('10:00 – 10:30', 'Dr. Senthil Kumar Muthappa', 'NIPGR'),
                self::talk('10:30 – 11:00', 'Dr. Soham Ray', 'ICAR-IARI'),
                self::talk('11:00 – 11:15', 'Dr. Rishav Sahil', 'BHU', true),
            ]),
            new Session('s6', 6, 'Complex Systems in Biology', '11:30 – 13:15', 'To be confirmed', self::D2_VENUE, 330,
                'Networks, emergence and the physics of living systems.', [
                self::talk('11:30 – 12:00', 'Dr. Samrat Chatterjee', 'THSTI'),
                self::talk('12:00 – 12:30', 'Dr. Areejit Samal', 'IMSc, Chennai'),
                self::talk('12:30 – 13:00', 'Dr. Ganesh Bagler', 'IIIT Delhi'),
                self::talk('13:00 – 13:15', 'Dr. Rakesh Pandey', 'BHU', true),
            ]),
            new Session('s7', 7, 'Molecular Biophysics and Biophysical Chemistry', '14:15 – 16:00', 'Dr. Arnab Bhattacharjee', self::D2_VENUE, 48,
                'Forces, folding and dynamics of the molecules that do the work.', [
                self::talk('14:15 – 14:45', 'Dr. Suman Dhar', 'TERI, New Delhi'),
                self::talk('14:45 – 15:15', 'Dr. Shruthi Viswanath', 'NCBS'),
                self::talk('15:15 – 15:45', 'Dr. Ruchi Anand', 'IIT Bombay'),
                self::talk('15:45 – 16:00', 'Dr. Anupam Mondal', 'IIT Kharagpur', true),
            ]),
        ];
    }

    public static function session(string $id): ?Session
    {
        return array_find(self::sessions(), static fn(Session $s) => $s->id === $id);
    }

    /**
     * Day timeline. Items are either ['kind'=>'event', ...] or ['kind'=>'session', 'session'=>Session].
     * @return list<array<string,mixed>>
     */
    public static function days(): array
    {
        $ev = static fn(string $time, string $title, string $icon, string $venue = '', string $note = ''): array =>
            ['kind' => 'event', 'time' => $time, 'title' => $title, 'icon' => $icon, 'venue' => $venue, 'note' => $note];
        $se = static fn(string $id): array => ['kind' => 'session', 'session' => self::session($id)];

        return [
            [
                'key' => 'day1', 'label' => 'Day 1', 'short' => '27 Nov', 'date' => 'Friday, 27 November 2026',
                'venue' => 'Auditorium, JNU',
                'items' => [
                    $ev('09:00 – 09:50', 'Registration, welcome & inaugural remarks', 'welcome', self::D1_VENUE),
                    $se('s1'),
                    $ev('11:20 – 11:50', 'Tea / Coffee break', 'tea'),
                    $se('s2'),
                    $ev('13:20 – 14:20', 'Lunch', 'lunch', self::D1_VENUE),
                    $se('s3'),
                    $ev('15:50 – 16:20', 'Tea / Coffee break', 'tea'),
                    $se('s4'),
                    $ev('18:05 – 19:30', 'Poster & networking session', 'poster', 'SC&IS'),
                    $ev('19:30 onwards', 'Gala dinner', 'dinner', 'SC&IS', 'Informal reflections on the SC&IS journey'),
                ],
            ],
            [
                'key' => 'day2', 'label' => 'Day 2', 'short' => '28 Nov', 'date' => 'Saturday, 28 November 2026',
                'venue' => 'Auditorium, JNU',
                'items' => [
                    $se('s5'),
                    $ev('11:15 – 11:30', 'Tea & informal conversations', 'tea'),
                    $se('s6'),
                    $ev('13:15 – 14:15', 'Lunch & conversations', 'lunch', self::D2_VENUE),
                    $se('s7'),
                    $ev('16:00 – 16:30', 'Valedictory session & poster awards', 'close', self::D2_VENUE),
                ],
            ],
        ];
    }

    /** Flat list of every talk with its session, for the speaker wall. */
    public static function speakers(): array
    {
        $out = [];
        foreach (self::sessions() as $s) {
            foreach ($s->talks as $i => $t) {
                $out[] = ['talk' => $t, 'session' => $s, 'index' => $i];
            }
        }
        return $out;
    }
}
