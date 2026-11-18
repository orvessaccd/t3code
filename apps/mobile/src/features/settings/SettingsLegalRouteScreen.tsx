import { useGT } from "../../i18n/runtime";
import { SettingsLegalDocumentRouteScreen } from "./components/SettingsLegalDocumentRouteScreen";
import { LEGAL_URL } from "./lib/legal-document-url";

export function SettingsLegalRouteScreen() {
  const gt = useGT();
  return <SettingsLegalDocumentRouteScreen documentName={gt("Legal")} documentUrl={LEGAL_URL} />;
}
