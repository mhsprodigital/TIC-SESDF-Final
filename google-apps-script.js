// ============================================================================
// INSTRUÇÕES PARA CONFIGURAR A PLANILHA DO GOOGLE SHEETS
// ============================================================================
// 1. Abra a sua planilha do Google Sheets:
//    https://docs.google.com/spreadsheets/d/1RmX1HndQ3r7Vpjj2eNpwLCt3D8ezCQxdBAvWqrkuCrU/edit
// 2. No menu superior, clique em "Extensões" > "Apps Script".
// 3. Apague qualquer código que estiver lá e cole TODO o código abaixo.
// 4. Clique no ícone de disquete (Salvar) ou pressione Ctrl+S / Cmd+S.
// 5. Clique em "Implantar" (Deploy) no canto superior direito > "Nova implantação".
// 6. Em "Selecione o tipo", escolha "App da Web" (ícone de engrenagem).
// 7. Preencha:
//    - Descrição: "API do Formulário"
//    - Executar como: "Eu" (seu email)
//    - Quem tem acesso: "Qualquer pessoa" (Isso é muito importante!)
// 8. Clique em "Implantar".
// 9. Autorize os acessos (se o Google avisar que não é seguro, clique em "Avançado" > "Acessar...").
// 10. Copie a "URL do app da Web" gerada.
// 11. Volte ao AI Studio e cole essa URL no campo VITE_GOOGLE_SCRIPT_URL.
// ============================================================================

function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    
    // Parse the incoming JSON data
    var data = JSON.parse(e.postData.contents);
    
    // Get headers from the first row
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn() || 1).getValues()[0];
    
    // If the sheet is empty, create headers based on the JSON keys
    if (headers.length === 1 && headers[0] === "") {
      headers = Object.keys(data);
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      // Make headers bold and add background color
      var headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setFontWeight("bold");
      headerRange.setBackground("#f3f4f6");
      sheet.setFrozenRows(1);
    }
    
    // Map data to row based on headers
    var row = headers.map(function(header) {
      return data[header] !== undefined ? data[header] : "";
    });
    
    // Append the row
    sheet.appendRow(row);
    
    return ContentService.createTextOutput(JSON.stringify({ "status": "success" }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ "status": "error", "message": error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doOptions(e) {
  return ContentService.createTextOutput("")
    .setMimeType(ContentService.MimeType.TEXT);
}
