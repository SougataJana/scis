<section class="section programme" id="programme" data-scene="3">
  <div class="wrap">
    <p class="eyebrow" data-reveal>Programme</p>
    <h2 class="big" data-split>Two days. Seven sessions.</h2>
    <p class="body" data-reveal>Choose a session — a model of the science unfolds, and the talks emerge from it.</p>

    <div class="daytabs" role="tablist" aria-label="Day" data-reveal>
      <?php foreach ($days as $i => $d): ?>
        <button class="btn tab daytab<?= $i === 0 ? ' on' : '' ?>" role="tab" aria-selected="<?= $i === 0 ? 'true' : 'false' ?>" data-day="<?= e($d['key']) ?>">
          <span><b><?= e($d['label']) ?></b> · <?= e($d['short']) ?></span>
        </button>
      <?php endforeach; ?>
    </div>

    <?php foreach ($days as $i => $d): ?>
      <div class="day<?= $i === 0 ? ' on' : '' ?>" data-dayview="<?= e($d['key']) ?>">
        <p class="day-head"><b><?= e($d['date']) ?></b> <span><?= e($d['venue']) ?></span></p>
        <ol class="timeline">
          <?php foreach ($d['items'] as $j => $it): ?>
            <?php if ($it['kind'] === 'event'): ?>
              <li class="tl event" style="--i:<?= $j ?>" data-reveal>
                <time><?= e($it['time']) ?></time>
                <div class="evt">
                  <i class="eico e-<?= e($it['icon']) ?>" aria-hidden="true"></i>
                  <div><b><?= e($it['title']) ?></b>
                    <?php if ($it['venue'] || $it['note']): ?><small><?= e(trim($it['venue'] . ($it['venue'] && $it['note'] ? ' · ' : '') . $it['note'])) ?></small><?php endif; ?>
                  </div>
                </div>
              </li>
            <?php else: $s = $it['session']; ?>
              <li class="tl sess" style="--i:<?= $j ?>;--h:<?= $s->hue ?>" data-reveal>
                <time><?= e($s->time) ?></time>
                <div class="session glass" role="button" tabindex="0" data-session="<?= e($s->id) ?>" data-tilt aria-label="Open Session <?= $s->number ?> — <?= e($s->title) ?>">
                  <span class="s-no">Session <?= $s->number ?></span>
                  <strong><?= e($s->title) ?></strong>
                  <span class="s-meta">Chairs · <?= e($s->chairs) ?></span>
                  <span class="s-people">
                    <?php foreach ($s->talks as $ti => $t): if ($ti >= 4) break; ?><button type="button" class="spk-chip" style="--h:<?= $s->hue ?>" data-open="<?= e($s->id) ?>" data-talk="<?= $ti ?>" aria-label="<?= e($t->speaker) ?> — open abstract"><?= e($t->initials()) ?></button><?php endforeach; ?>
                    <em><?= count($s->talks) ?> talks</em>
                  </span>
                  <span class="s-open">Unfold <i class="arrow"></i></span>
                </div>
              </li>
            <?php endif; ?>
          <?php endforeach; ?>
        </ol>
      </div>
    <?php endforeach; ?>
  </div>
</section>
