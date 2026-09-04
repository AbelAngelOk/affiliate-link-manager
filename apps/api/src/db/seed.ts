import { db } from "./client.js";
import { products, slots, users } from "./schema.js";

// Datos de ejemplo con variedad (varios productos, apps y status de slot)
// para poder probar filtros/orden en el dashboard. Idempotente: limpia las
// tablas antes de insertar, para poder correrlo las veces que haga falta sin
// acumular filas huérfanas ni cambiar el usuario "actual" que cachea
// getCurrentUserId() en el servidor corriendo.
async function seed() {
  await db.delete(slots);
  await db.delete(products);
  await db.delete(users);

  const [user] = await db
    .insert(users)
    .values({ email: "abel.angel1996@gmail.com" })
    .returning();

  const [libro] = await db
    .insert(products)
    .values({
      ownerUserId: user.id,
      titulo: "El club de las 5 de la mañana",
      descripcionCorta: "El hábito matutino que puede cambiar tu vida, por Robin Sharma.",
      categoria: "libros",
      imagenUrl: "https://example.com/imagenes/club-de-las-5.jpg",
      imagenAlt: "Portada del libro El club de las 5 de la mañana",
      apps: ["despertador-app"],
    })
    .returning();

  const [despertadorSolar] = await db
    .insert(products)
    .values({
      ownerUserId: user.id,
      titulo: "Despertador con luz solar",
      descripcionCorta: "Simula el amanecer para despertar mejor.",
      categoria: "electronica",
      imagenUrl: "https://example.com/imagenes/despertador-solar.jpg",
      apps: ["despertador-app", "training-app"],
    })
    .returning();

  const [botella] = await db
    .insert(products)
    .values({
      ownerUserId: user.id,
      titulo: "Botella térmica 1L",
      descripcionCorta: "Mantiene la temperatura hasta 12 horas.",
      categoria: "accesorios",
      imagenUrl: "https://example.com/imagenes/botella-termica.jpg",
      apps: ["training-app"],
    })
    .returning();

  await db.insert(slots).values([
    {
      productId: libro.id,
      dominio: "amazon.com.mx",
      affiliateUrl: "https://www.amazon.com.mx/dp/EJEMPLO?tag=tu-tag-21",
      priority: 0,
    },
    {
      productId: libro.id,
      dominio: "mercadolibre.com.ar",
      affiliateUrl: "https://www.mercadolibre.com.ar/social/tu-usuario?matt_word=EJEMPLO",
      priority: 0,
    },
    {
      productId: despertadorSolar.id,
      dominio: "amazon.com",
      affiliateUrl: "https://www.amazon.com/dp/OTROEJEMPLO?tag=tu-tag-20",
      priority: 0,
    },
    // Dos candidatos para el mismo dominio: el de mayor prioridad (0) está
    // roto a propósito, para que el dashboard muestre la cola de fallback.
    {
      productId: despertadorSolar.id,
      dominio: "amazon.com.mx",
      affiliateUrl: "https://www.amazon.com.mx/dp/YANOESTA?tag=tu-tag-21",
      priority: 0,
      status: "broken",
    },
    {
      productId: despertadorSolar.id,
      dominio: "amazon.com.mx",
      affiliateUrl: "https://www.amazon.com.mx/dp/SUSTITUTO?tag=tu-tag-21",
      priority: 1,
    },
    {
      productId: botella.id,
      dominio: "mercadolibre.com.mx",
      affiliateUrl: "https://articulo.mercadolibre.com.mx/MLM-1234567890-botella",
      priority: 0,
    },
  ]);

  console.log("Seed cargado:");
  console.log(`  user: ${user.id}`);
  console.log(`  producto "${libro.titulo}": ${libro.id}`);
  console.log(`  producto "${despertadorSolar.titulo}": ${despertadorSolar.id}`);
  console.log(`  producto "${botella.titulo}": ${botella.id}`);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
