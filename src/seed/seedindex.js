import db from "../config/db.js";
import { seedCompanyBank } from "./companybankdetails.js";
import { seedCompanyDetails } from "./companyDetails.js";
import { seedCustomers } from "./customer.js";
import { seedEmployees } from "./employee.js";
import { seedTamilNaduRiceBrands } from "./products/brand.js";
import { seedRiceCategories } from "./products/categories.js";
import { seedRiceQuantities } from "./products/quantity.js";
import { seedVendors } from "./vendor.js";

export const seed = async () => {
  await seedTamilNaduRiceBrands(db);
  await seedRiceCategories(db);
  await seedRiceQuantities(db);
  await seedEmployees(db);
  await seedCustomers(db);
  await seedVendors(db);
  await seedCompanyDetails(db);
  await seedCompanyBank(db);
};
