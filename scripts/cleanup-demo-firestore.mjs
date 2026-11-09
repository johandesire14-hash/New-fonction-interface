#!/usr/bin/env node
import { applicationDefault, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const args = process.argv.slice(2);
const hasFlag = (flag) => args.includes(flag);
const valueAfter = (flag) => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
};

if (hasFlag("--help") || hasFlag("-h")) {
  console.log(
    `Usage:\n  pnpm cleanup:demo-firestore -- --project <firebase-project-id>\n  pnpm cleanup:demo-firestore -- --project <firebase-project-id> --apply --confirm-project <same-project-id>\n\nSans --apply, le script affiche uniquement les documents de démonstration ciblés.\nIl utilise GOOGLE_APPLICATION_CREDENTIALS ou les identifiants ADC locaux.`,
  );
  process.exit(0);
}

const projectId =
  valueAfter("--project") || process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT;
const apply = hasFlag("--apply");
const confirmedProjectId = valueAfter("--confirm-project");

if (!projectId) {
  console.error(
    "Projet Firebase manquant. Passez --project <project-id> ou définissez FIREBASE_PROJECT_ID.",
  );
  process.exit(1);
}

if (apply && confirmedProjectId !== projectId) {
  console.error(
    "Suppression refusée : ajoutez --confirm-project avec exactement le même ID que --project.",
  );
  process.exit(1);
}

const productNames = new Map([
  ["prod-forex-elite", "Club VIP Forex & Crypto Afrique"],
  ["prod-ecommerce-mastery", "Masterclass E-Commerce & Logistique UEMOA"],
  ["prod-canva-templates", "Pack 500+ Templates Canva & Publicités TikTok"],
  ["prod-nocode-ia", "Académie No-Code & IA pour Créateurs"],
  ["prod-growth-ebook", "Ebook Growth Hacking Mobile Money 2026"],
]);
const productIds = [...productNames.keys()];
const productIdSet = new Set(productIds);
const workforceNames = new Set(["Kader Diop", "Aïcha Sanogo", "Patrick Mbia", "Séphora Koffi"]);
const partnerNames = new Set([
  "Wave Digital Finance",
  "Orange Money Afrique",
  "Canal+ Créateurs Afrique",
  "Techstars Africa Alumni",
]);
const transactionIds = [
  ...Array.from({ length: 24 }, (_, index) => `tx-demo-${index + 1}`),
  "tx-aff-1",
  "tx-aff-2",
  "tx-other-1",
];
const customerIds = Array.from({ length: 24 }, (_, index) => `cust-demo-${index + 1}`);

const targetDocuments = [
  ...productIds.map((id) => ({ collection: "products", id })),
  ...transactionIds.map((id) => ({ collection: "transactions", id })),
  ...customerIds.map((id) => ({ collection: "customers", id })),
  ...Array.from({ length: 4 }, (_, index) => ({
    collection: "workforce",
    id: `worker-demo-${index + 1}`,
  })),
  ...Array.from({ length: 4 }, (_, index) => ({
    collection: "partners",
    id: `deal-demo-${index + 1}`,
  })),
];

function isKnownSeedDocument(collection, id, data) {
  if (!data || data.id !== id) return false;

  if (collection === "products") {
    return productNames.get(id) === data.name;
  }
  if (collection === "transactions") {
    if (id.startsWith("tx-demo-")) return productIdSet.has(data.productId);
    if (id === "tx-aff-1") return data.productId === "aff-prod-nexus" && data.type === "affiliate";
    if (id === "tx-aff-2")
      return data.productId === "aff-prod-alpha-bot" && data.type === "affiliate";
    if (id === "tx-other-1") return data.productId === "mansa-bonus-q1" && data.type === "other";
  }
  if (collection === "customers") {
    return (
      id.startsWith("cust-demo-") &&
      productIdSet.has(data.productId) &&
      typeof data.email === "string"
    );
  }
  if (collection === "workforce") {
    return /^worker-demo-[1-4]$/.test(id) && workforceNames.has(data.name);
  }
  if (collection === "partners") {
    return /^deal-demo-[1-4]$/.test(id) && partnerNames.has(data.partnerName);
  }
  return false;
}

const app = initializeApp({
  credential: applicationDefault(),
  projectId,
});
const databaseId = process.env.FIRESTORE_DATABASE_ID;
const db = databaseId ? getFirestore(app, databaseId) : getFirestore(app);

console.log(`Projet ciblé : ${projectId}`);
console.log(`Base Firestore : ${databaseId || "(default)"}`);
console.log(
  apply
    ? "MODE SUPPRESSION — les documents marqués seront supprimés."
    : "MODE SIMULATION — aucune donnée ne sera modifiée.",
);

const foundDocuments = [];
const skippedDocuments = [];

for (const target of targetDocuments) {
  const ref = db.collection(target.collection).doc(target.id);
  const snapshot = await ref.get();
  if (!snapshot.exists) continue;

  const data = snapshot.data();
  if (isKnownSeedDocument(target.collection, target.id, data)) {
    foundDocuments.push({ ...target, ref });
  } else {
    skippedDocuments.push(target);
  }
}

if (foundDocuments.length === 0) {
  console.log(
    "Aucun document de démonstration correspondant aux marqueurs attendus n’a été trouvé.",
  );
} else {
  console.log(`\n${foundDocuments.length} document(s) de démonstration ciblé(s) :`);
  for (const { collection, id } of foundDocuments) console.log(`  ${collection}/${id}`);
}

if (skippedDocuments.length > 0) {
  console.warn(
    `\n${skippedDocuments.length} document(s) portant un identifiant réservé mais ne correspondant pas au contenu attendu seront conservés :`,
  );
  for (const { collection, id } of skippedDocuments) console.warn(`  ${collection}/${id}`);
}

if (!apply) {
  console.log(
    "\nAucune suppression effectuée. Après vérification du projet et de cette liste, relancez avec --apply --confirm-project <project-id> pour supprimer.",
  );
  process.exit(0);
}

for (let offset = 0; offset < foundDocuments.length; offset += 450) {
  const batch = db.batch();
  for (const { ref } of foundDocuments.slice(offset, offset + 450)) batch.delete(ref);
  await batch.commit();
}

console.log(
  `\nSuppression terminée : ${foundDocuments.length} document(s) supprimé(s) de ${projectId}.`,
);
