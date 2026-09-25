import { parse } from "yaml";
import rawNow from "../../content/now.yml?raw";

export const nowItems = parse(rawNow);

export default nowItems;
