window.addEventListener("error", (error) => window.alert(error.message));
require.config({ paths: { vs: 'monaco' } });

import { parseNumber } from "./utilities/general.js";
import { isAssetEditable, getAssetBinary, uploadAsset, getUniverseId, handleAPIErrors } from "./utilities/api.js";
import init_rbx2xml, { binary_to_xml, xml_to_binary } from "./rbx2xml/index.js";
const editForm = document.getElementById("editForm");
const placeIdEditInput = document.getElementById("placeIdEdit");
const placeIdUploadInput = document.getElementById("placeIdUpload");
const monacoContainer = document.getElementById("monaco");
const textDecoder = new TextDecoder("utf-8");
const textEncoder = new TextEncoder("utf-8");

const searchParams = Object.fromEntries(new URLSearchParams(window.location.search).entries());
if ("placeId" in searchParams) {
    placeIdUploadInput.value = placeIdEditInput.value = searchParams.placeId;
    const placeIdEdit = parseNumber(searchParams.placeId);
    const universeId = await getUniverseId(placeIdEdit);
    /*
    const placeInfo = await getAssetInfo(placeIdEdit);
    handleAPIErrors(placeInfo);
    if (placeInfo.AssetTypeId !== 9) throw new TypeError("Invalid Place ID, not a place");
    */
    if (!(await isAssetEditable(placeIdEdit))) throw new Error("You are not authorized to edit this place");
    // const universeId = await getUniverseId(placeIdEdit);
    const placeBinary = await getAssetBinary(placeIdEdit);
    await init_rbx2xml();
    const placeXml = textDecoder.decode(binary_to_xml(placeBinary));
    require(['vs/editor/editor.main'], function () {
        const editor = monaco.editor.create(monacoContainer, {
            language: 'xml',       // XML only
            theme: 'vs-dark',      // dark theme
            automaticLayout: true, // resize with window
            value: placeXml,
        });

        editForm.hidden = false;

        editForm.addEventListener("submit", function (event) {
            event.preventDefault();
            const { submitter } = event;
            const formData = new FormData(event.target);

            switch (submitter.name) {
                case "upload": {
                    const editorValue = editor.getValue();
                    const newPlaceBinary = xml_to_binary(textEncoder.encode(editorValue));
                    const placeFile = new File([newPlaceBinary], "place.rbxl", { type: 'application/octet-stream' });
                    const placeIdUpload = Number(formData.get("placeId"));
                    let shouldPublish;

                    switch (submitter.value) {
                        case "publish": shouldPublish = true; break;
                        case "save": shouldPublish = false; break;
                        default: throw new Error("Unknown upload action");
                    };

                    uploadAsset(placeFile, placeIdUpload, universeId, "Place", shouldPublish);
                    break;
                };

                default: throw new Error("Unknown submitter");
            };
        });
    });
};