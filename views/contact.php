<section class="section contact" id="contact" data-scene="4">
  <div class="wrap center">
    <p class="eyebrow" data-reveal>Contact</p>
    <h2 class="big" data-split>Questions? Write to us.</h2>
    <div class="contact-card glass" data-reveal>
      <p class="person-role"><?= e($contact['role']) ?></p>
      <h3><?= e($contact['name']) ?></h3>
      <a class="contact-mail" href="mailto:<?= e($contact['email']) ?>"><?= e($contact['email']) ?></a>
      <p class="person-sub"><?= e($event['school']) ?><br><?= e($event['university']) ?> 110067</p>
    </div>
  </div>
</section>
