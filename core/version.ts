// Version de l'application : celle de package.json, mise à jour par semantic-release à chaque release.
import pkg from "../package.json";
export const VERSION: string = pkg.version;
