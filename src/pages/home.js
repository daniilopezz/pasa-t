const app = document.querySelector("#app");

document.body.classList.add("home-body");

app.innerHTML = `
  <main class="home-page">
    <section class="home-hero" aria-label="NEW PASA-T">
      <div class="home-brand">
        <span class="logo-fx logo-fx-home">
          <img class="brand-logo large" src="/public/logo-clean.png" alt="NEW PASA-T" />
        </span>
        <p class="eyebrow">Mercado nocturno de bebidas</p>
        <h1>NEW PASA-T</h1>
        <a class="primary-link" href="/market.html">Entrar al mercado</a>
      </div>
    </section>

    <section class="home-preview" aria-label="Vista previa del mercado">
      <span>Ginebra</span>
      <strong>6,00 €</strong>
      <span>Ron</span>
      <strong>5,70 €</strong>
      <span>Whisky</span>
      <strong>6,50 €</strong>
      <span>Vodka</span>
      <strong>5,50 €</strong>
    </section>
  </main>
`;
