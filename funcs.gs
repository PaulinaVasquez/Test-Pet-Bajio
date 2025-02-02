var ss = SpreadsheetApp.openById(id)
var ws_info = ss.getSheetByName("Info")
var ws_config = ss.getSheetByName("Config")
var ws_cli = ss.getSheetByName("Clientes")
var ws_pag = ss.getSheetByName("Pagos")
var ws_pag_cred = ss.getSheetByName("Pagos Crédito")
var ws_rev_fol = ss.getSheetByName("Revisión Folios Día")
var usuarioMail = Session.getActiveUser().getEmail()
var today = new Date();
var hoy = new Date().toLocaleDateString('es-MX',{day: '2-digit',month: 'short',year: 'numeric'})
var userName = _getUser(usuarioMail)

function getRecolectores(){
  col = _getColumn(ws_config,"Prospectadores/Recolectores")
  options = ws_config.getRange(col+1,1,ws_config.getLastRow()).getValues().filter(String)
  options.shift()
  return [options,_getUser(usuarioMail)]
}

function generateTableForEmail(dataArray){
  //generate Header
  var header = "<tr> "//document.createElement("tr");
  var headerLen = dataArray[0].length
  cols = new Array(headerLen);
  for (let x=0 ; x<headerLen ; x++){ 
    header += "<th> "+ String (dataArray[0][x]) + " </th>"
  }
  header += "</tr>"
  //generate Body
  var tableLen = dataArray[1][0].length
  var body = ""                
  dataArray[1].forEach(function(r){
    body += "<tr> "
    for (let x=0 ; x<tableLen ; x++){   
      body += "<th> "+ String (r[x]) + " </th>"
    }
    body += "</tr>"
  })
  return [header, body]
}

// falta poner la suma de todos los folios, y hacer que el botón se desactive y pueda continuar con el proceso
function sendEmail(filterParams,rangeNameColsToShow,sum) {
  var template = HtmlService.createTemplateFromFile('email_template');
  table = generateTableForEmail(filterAndReturnInfoDataForPage(filterParams,rangeNameColsToShow,sum))
  template.cliente = userName;
  template.header = table [0]
  template.body = table [1]
  template.efectivo = table [2]
  var emailBody = template.evaluate().getContent();
  GmailApp.sendEmail('petbajio@gmail.com',
    'Notificación de Desacuerdo por parte de '+userName,'',
    {htmlBody: emailBody, cc: usuarioMail}
  );
  return true
}

function loadModalFilters() {
  const htmlServ = HtmlService.createTemplateFromFile('Modal')
  const html = htmlServ.evaluate();
  const ui = SpreadsheetApp.getUi();
  ui.showModalDialog(html,"Editar Fecha de Reporte");
}


//------------------------------------------------------------------------------------------------------------------------------------------------------
                                                          //FUNCIONES DE LA PAGINA DE PAGE
function registrarFolioNuevo(userInfo) {
  userInfo.user = userName;
  if (userInfo.user == null){ return usuarioMail}
  user_properties = PropertiesService.getUserProperties().getProperties()
  if (user_properties["lastFolio"] == userInfo.folio) {return false}
  var lr = ws_info.getLastRow()+1
  var mes = "=TEXT("+_columnToLetter(_getColumn(ws_info,"Fecha de Servicio")+1)+ lr+",\"MMMM\")"
  var totalValor = "="+_columnToLetter(_getColumn(ws_info,"Total de Servicio")+1)+ lr+"+"+_columnToLetter(_getColumn(ws_info,"Total Producto")+1)+ lr
  var totalPagado = "="+_columnToLetter(_getColumn(ws_info,"Pagado Servicio")+1)+ lr+"+"+_columnToLetter(_getColumn(ws_info,"Pagado Producto")+1)+ lr
  var totalPorCobrar = "="+_columnToLetter(_getColumn(ws_info,"Por Cobrar Servicio")+1)+ lr+"+"+_columnToLetter(_getColumn(ws_info,"Por Cobrar Producto")+1)+ lr
  var comision = "="+_columnToLetter(_getColumn(ws_info,"Total Valor")+1)+ lr+"*0.1"
  var cobradoPor = ''
  var cobradoFecha = ''
  //var formulaProspectador = "=VLOOKUP("+_columnToLetter(_getColumn(ws_info,"MVZ")+1)+ lr+",Clientes!A:B,2,FALSE)"
  //userInfo.pros = user_properties["prospectador"];
  if(userInfo.date ===""){
    userInfo.date = today
  }else{
    userInfo.date = new Date(userInfo.date)
    userInfo.date.setHours(12,0,0,0)
  }
  if(userInfo.dateCert !==""){
    userInfo.dateCert = new Date(userInfo.dateCert)
    userInfo.dateCert.setHours(12,0,0,0)
  }
  if (userInfo.peso !="Peso") {userInfo.peso = userInfo.peso.substr(userInfo.peso.indexOf('-')+2);} else {userInfo.peso=""}
  var gestion = []
  
  if (userInfo.resta == 0 && (userInfo.restaProd == 0.00 || userInfo.restaProd == null)){ // cuando no debe nada
    //gestion.push("X cuadrar")
    gestion.push("Concluido")
    cobradoPor = userInfo.user
    cobradoFecha = userInfo.date
  } else if (userInfo.resta != 0 && (userInfo.restaProd == 0.00 || userInfo.restaProd == null)){
    //gestion.push("X cuadrar")
    gestion.push("X cobrar")
  } else if (userInfo.resta == 0 && userInfo.restaProd != null) {
    //gestion.push("X cuadrar")
    gestion.push("X cobrar")
  } else if (userInfo.resta != 0 && userInfo.restaProd != 0.00 ) {
    //gestion.push("X cuadrar")
    gestion.push("X cobrar")
  }
  //if (userInfo.pago == "Transferencia" || userInfo.pago == "Tarjeta") { // aqui poner lógica de cada tipo de pago
  //  gestion.push("X cuadrar")
  if (userInfo.pago == "Crédito"){
    //gestion.push("Crédito")
    gestion = ["Crédito"]
  }
  
  ws_info.appendRow([userInfo.folio, userInfo.date, mes, userInfo.prospect, userInfo.user, gestion.join(","), capitalizeWords(userInfo.vet), userInfo.region, userInfo.edad, userInfo.peso, capitalizeWords(userInfo.tipo), capitalizeWords(userInfo.mascota), capitalizeWords(userInfo.raza),capitalizeWords(userInfo.propietario), userInfo.cremacion, userInfo.paquete, userInfo.valor, userInfo.pagado, userInfo.resta, userInfo.factura,userInfo.pago, userInfo.obs, userInfo.producto, userInfo.valorProd, userInfo.pagadoProd, userInfo.restaProd, totalValor, totalPagado, totalPorCobrar, comision, cobradoPor, cobradoFecha,"",userInfo.certificado,capitalizeWords(userInfo.nomCert),userInfo.dateCert, userInfo.dedic]) 
  PropertiesService.getUserProperties().setProperty("lastFolio", userInfo.folio)
  Logger.log(userInfo.folio);
  ws_info.getRange("A1:A").setNumberFormat('@');
  //_addInfoSheetProtection()
  return true
}

function capitalizeWords (str){
  if (str=="NA"||str=="Na"||str=="na"){return "NA"}
  var words = str.split(' '); 
  // Capitalize the first letter of each word
  for (var i = 0; i < words.length; i++) {
    var word = words[i];
    if (word.length > 0) {
      words[i] = word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }
  }
  // Join the words back into a string
  var capitalizedString = words.join(' ');
  return capitalizedString;
}

function splitStringIntoUnitsAndDecimals(inputString) {
  var decimalSeparator = /[.,]/; // Regular expression to match either ',' or '.'
  var splitArray = inputString.split(decimalSeparator);
  var units = splitArray[0];
  var decimals = splitArray[1];
  switch (true){
    case (units=="1"&& isNaN(decimals)):
      return units+" Año"
    case (units!="1"&& isNaN(decimals)):
      return units+" Años"
    case (units=="1"&& decimals=="1"):
      return units+" Año "+ decimals+" Mes"
    case (units!="1"&& decimals!="1"):
      return units+" Años "+decimals+" Meses"
    case (units=="1"&& decimals!="1"):
      return units+" Año "+decimals+" Meses"
  }
}

function elborarCertificado (infoCertificado){
  try{
    var destinationFolder = DriveApp.getFolderById("1U4lCG6JFstv4x5u-nNeAEHDI7sy4nyBo");
    var template = DriveApp.getFileById('1cYT40ruRkSEKbcT76LwXLbA3OlgIwrN2CNQ5cAD1_Gg');
    var newCertificateId = template.makeCopy(infoCertificado["folio"]+"|"+infoCertificado["nombreMascota"][0],destinationFolder).getId();
    var newSpreadSheet = SpreadsheetApp.openById(newCertificateId)
    newSheet = newSpreadSheet.getSheetByName("Sheet 1")
    var keys = Object.keys(infoCertificado);
    keys.filter(v => v!=="folio").forEach(function(key){
      newSheet.getRange(infoCertificado[key][1]).setValue(infoCertificado[key][0])
    });
    return true
  }catch (error){
    Logger.log(error)
    return error
  }
}
//------------------------------------------------------------------------------------------------------------------------------------------------------
//FUNCION PARA CHEQUEAR DUPLICIDAD DE FOLIO
function checkFolios (f){
  var listFolios = ws_info.getRange(2,1,ws_info.getLastRow(),5).getValues()
  .map(function(r){return [r[0],r[1],r[4]];});
  const foundItem = listFolios.find(sublist => sublist[0] === f);
  // If foundItem exists, return the second value; otherwise, return null
  return foundItem ? "El folio "+foundItem[0]+" ya fue creado el "+foundItem[1].toLocaleDateString('es-MX',{day: '2-digit',month: 'short',year: 'numeric'})+" por "+foundItem[2] : null;
}
//------------------------------------------------------------------------------------------------------------------------------------------------------
//FUNCION PARA ESCOGER PROSPECTADOR Y TIPO A PARTIR DE CLIENTE
function lookForProspect(vet) {
  var data = ws_cli.getDataRange().getValues();
  var vetList = data.map(function(r){return r[0];});
  //var tipoList = data.map(function(r){return r[2];});
  var position = vetList.indexOf(vet);
  if (position > -1){
    propect = ws_cli.getRange(position+1,2).getValue()
    return [true,vet,propect]//tipoList[position]
  } else {
    return [false,vet]
  }
}
//------------------------------------------------------------------------------------------------------------------------------------------------------
//FUNCION PARA RECOLECTAR CLIENTES DE LA TABLA DE CLIENTES
function getWords() {
var data = ws_cli.getRange(2,1, ws_cli.getLastRow(),1).getValues()
var options = {};
data.forEach(function(v){
  options[v[0]] = null;
});
return options;
}
//------------------------------------------------------------------------------------------------------------------------------------------------------
//FUNCION PARA RECOLECTAR MODELOS DE PRODUCTO SELECCIONADO 
function getModelos(m) {
  //Lista de productos
  var productos = ws_config.getRange(2,_getColumn(ws_config,"Productos")+1,ws_config.getLastRow(),2).getValues();
  var productosLimpio = []
  productos.forEach(function(e){ if(e[0]!=""){productosLimpio.push(e)}});
  var modelos = []
  for (var i=0;i<=productosLimpio.length-1;i++){
    if (productosLimpio[i][0] == m) {
      modelos.push(productosLimpio[i][1])
    }
  }
  if (modelos == ""){
    return false
  }
  return modelos
}

//------------------------------------------------------------------------------------------------------------------------------------------------------
                                                          //FUNCIONES DE LA PAGINA DE PAGOS
function registrarPago (foliosList){
  filter = ws_info.getFilter();
  if (filter) {
    filter.remove()
  }
  var lrColA = ws_info.getRange("A:A").getValues().filter(String);
  colAString = lrColA.map(v => v.join(","));
  console.log(foliosList)
  var listOfRowsRegisters = foliosList.map(folio => colAString.indexOf(folio)+1)
  var flag = true
  var counter = 0
  var colFolio = _getColumnInfo("Folio")
  listOfRowsRegisters.forEach (row =>{

    let folID = ws_info.getRange(row,colFolio+1).getValue()
    // identifica si dentro de la columna folios hay alguna fila en blanco
    if (folID != foliosList[counter] ){
      _findBlankValues();
      if(ws_info.getRange(row+1,colFolio+1).getValue() == foliosList[counter]){
        row +=1 
      }else{
        flag = false
      }
    }
    try{
      if (row == 0)
      {
        flag = false
        return
      }
      // saldar cuentas, borrando en por cobrar y sumandole al pagado
      let cobrarProd = ws_info.getRange(row,_getColumnInfo("Por Cobrar Producto")+1).getValue()
      let cobrarServ = ws_info.getRange(row,_getColumnInfo("Por Cobrar Servicio")+1).getValue()
      let prevPagadoProd = ws_info.getRange(row,_getColumnInfo("Pagado Producto")+1).getValue()
      let prevPagadoServ = ws_info.getRange(row,_getColumnInfo("Pagado Servicio")+1).getValue()
      let colPago = ws_info.getRange(row,_getColumnInfo("Pago")+1).getValue()
      let rangeColGest = ws_info.getRange(row,_getColumnInfo("Gestión")+1)
      let colGest = rangeColGest.getValue()
      ws_info.getRange(row,_getColumnInfo("Pagado Producto")+1).setValue(prevPagadoProd+cobrarProd)
      ws_info.getRange(row,_getColumnInfo("Pagado Servicio")+1).setValue(prevPagadoServ+cobrarServ)
      if (colGest.indexOf("X verificar")>=0){
        rangeColGest.setValue(colGest.replace("X verificar","Concluido"))
      } else if (colGest.indexOf("X cobrar")>=0 && colPago == "Transferencia") {
        rangeColGest.setValue(colGest.replace("X cobrar","X verificar"))
      }else if (colGest.indexOf("Crédito")>=0){
        rangeColGest.setValue(colGest.replace("Crédito","Concluido"))
      }else {
        rangeColGest.setValue(colGest.replace("X cobrar","Concluido"))
      }
      //adicionar info de fecha y quien cobró
      ws_info.getRange(row,_getColumnInfo("Cobrado por")+1).setValue(userName)
      ws_info.getRange(row,_getColumnInfo("Cobrado fecha")+1).setValue(today)
      ws_info.getRange(row,_getColumnInfo("Fecha Gestión")+1).setValue(today)
    } catch (e) {
      var errorMessage = 'An error occurred: ' + e.message;
      _sendErrorNotification(userName,row,"el script registrarPago",errorMessage)
      Logger.log('row '+row +' message '+ e.message)
    }
    counter += 1
  })
  if (flag){
    SpreadsheetApp.flush();
    return true
    } else {return false}
  }
//--------------------------------------------------------------------------------------------------------------------
                                        //FUNCIONES DE LA PAGINA DE MENU
  function addInfoToClientSheet(client,prospect){
    client = client.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ').trim();
    var listClients = ws_cli.getRange(2,1,ws_cli.getLastRow(),1).getValues().map(function(r){return r[0];});
    var position = listClients.indexOf(client);
    listClients.pop()
    if (position == -1){
      if (prospect != "") {
        ws_cli.appendRow([client,prospect,today])
      } else {return false}
      return client
    } else {
      return ""
    }
  }
  //------------------------------------------------------------------------------------------------------------------------------------------------------
                                                          //FUNCIONES DE LA PAGINA DE PAGOS CRÉDITO

//------------------------------------------------------------------------------------------------------------------------------------------------
                                            //FUNCIONES DE LA PAGINA DE RESUMEN REGISTRO DIARIO                                                  
function modifyFolios(folios, headers){
                      //declara variables principales
  
  var prohibedColsToBeModified = ['Total Valor','Total Pagado','Total Por Cobrar',"Por Cobrar Servicio","Por Cobrar Producto"]
  var wsHeadersRange = ws_info.getRange(1,1,1,ws_info.getLastColumn()).getValues();
  var listFolios = ws_info.getRange(1,1,ws_info.getLastRow(),1).getValues().map(function(r){return r[0];});
  var row = 0
  var foliosToChange = Object.keys(folios);
            //primer loop de Folios marcados para modificar
  var col = ""
  var colGestion = _getColumnInfo("Gestión")+1
  var colFecha = _getColumnInfo("Fecha de Servicio")+1
  var foliosConError = []
  var ayer = new Date()
  ayer.setDate(today.getDate() - 1)
  foliosToChange.forEach(function (f){
    row = listFolios.indexOf(f)+1
    var valColGest = ws_info.getRange(row,colGestion).getValue()
    var valColFecha = ws_info.getRange(row,colFecha).getValue()
    
    if (valColGest.indexOf("Concluido") >= 0 && !(valColFecha.setHours(0, 0, 0, 0) >= ayer.setHours(0, 0, 0, 0))){
        foliosConError.push(f)
        return
      }
          // segundo loop sobre los headers de la pag folio electrónico
    for(i=0; i<headers.length; i++){
      //go to next iteration if one of this headers
      if(prohibedColsToBeModified.indexOf(headers[i])>=0){
        continue
      }
      
      col = wsHeadersRange[0].indexOf(headers[i])+1
      
      var oldValueRange = ws_info.getRange(row,col);
      var oldValue = oldValueRange.getValue();
      if (folios[f][i] != oldValue){
        oldValueRange.setValue(folios[f][i]);
        oldValueRange.setBackground('green');
      }
    }
    oldValueRange = ws_info.getRange(row,wsHeadersRange[0].indexOf('Gestión')+1);
    oldValue = oldValueRange.getValue()
    if (!String(oldValue).includes("Modificado")){
      oldValueRange.setValue(String(oldValue)+',Modificado')
    }
    totalPagadoValue = ws_info.getRange(row,wsHeadersRange[0].indexOf('Total Pagado')+1).getValue();
    totalValorValue = ws_info.getRange(row,wsHeadersRange[0].indexOf('Total Valor')+1).getValue();

      // identifica si se modificó valores por cobrar = 0 entonces quita todos los campos para Gestion X cobrar
    if (totalPagadoValue == 0 || totalPagadoValue == '' || totalPagadoValue != totalValorValue){
      //borra info si el folio fue registrado como cobrado
      ws_info.getRange(row,wsHeadersRange[0].indexOf('Cobrado fecha')+1).clearContent()
      ws_info.getRange(row,wsHeadersRange[0].indexOf('Cobrado por')+1).clearContent()
      oldValueRange.setValue('X cobrar,Modificado')
        // calcula celda por cobrar servicio
      totalServicio = ws_info.getRange(row,wsHeadersRange[0].indexOf('Total de Servicio')+1).getValue();
      pagadoServicio = ws_info.getRange(row,wsHeadersRange[0].indexOf('Pagado Servicio')+1).getValue();
      porCobrarServicioRange = ws_info.getRange(row,wsHeadersRange[0].indexOf('Por Cobrar Servicio')+1);
      porCobrarServicioRange.setValue(totalServicio - pagadoServicio)
          // calcula celda por cobrar producto
      totalProducto = ws_info.getRange(row,wsHeadersRange[0].indexOf('Total Producto')+1).getValue();
      pagadoProducto = ws_info.getRange(row,wsHeadersRange[0].indexOf('Pagado Producto')+1).getValue();
      porCobrarProductoRange = ws_info.getRange(row,wsHeadersRange[0].indexOf('Por Cobrar Producto')+1);
      porCobrarProductoRange.setValue(totalProducto - pagadoProducto)
    //identifica si se modificó valores por cobrar = pagado entonces agrega todos los campos para Gestion=Concluido
    } else if ((totalPagadoValue != 0 || totalPagadoValue != '') && totalPagadoValue == totalValorValue){
      ws_info.getRange(row,wsHeadersRange[0].indexOf('Cobrado fecha')+1).setValue(today)
      ws_info.getRange(row,wsHeadersRange[0].indexOf('Cobrado por')+1).setValue(userName)
      oldValueRange.setValue('Concluido,Modificado')
      // calcula celda por cobrar servicio
      totalServicio = ws_info.getRange(row,wsHeadersRange[0].indexOf('Total de Servicio')+1).getValue();
      pagadoServicio = ws_info.getRange(row,wsHeadersRange[0].indexOf('Pagado Servicio')+1).getValue();
      porCobrarServicioRange = ws_info.getRange(row,wsHeadersRange[0].indexOf('Por Cobrar Servicio')+1);
      porCobrarServicioRange.setValue(totalServicio - pagadoServicio)
          // calcula celda por cobrar producto
      totalProducto = ws_info.getRange(row,wsHeadersRange[0].indexOf('Total Producto')+1).getValue();
      pagadoProducto = ws_info.getRange(row,wsHeadersRange[0].indexOf('Pagado Producto')+1).getValue();
      porCobrarProductoRange = ws_info.getRange(row,wsHeadersRange[0].indexOf('Por Cobrar Producto')+1);
      porCobrarProductoRange.setValue(totalProducto - pagadoProducto)
    }
  });
  SpreadsheetApp.flush();
  return foliosConError.join(",")
}

function filterAndReturnInfoDataForPage (filterParams,rangeNameColsToShow,sum = false, chipsReturn = false, sumLabel = false) {
  filterParams = _filterParamsHasUserName(filterParams)
  // para test var filterParams = {"Cobrado fecha":["=",[today.setHours(0, 0, 0, 0)]], "Cobrado por": ["=",["petbajio"]], "Pago":["=",["Efectivo"]], "Total Por Cobrar": ["!=",[0]]}
  var infoVals = ws_info.getDataRange().getValues()
  infoVals.shift()

  // filter all values from info depending on parameters
  var colsToFilter = Object.keys(filterParams)
  colsToFilter.forEach(colFil => {
    let col_num1 = _getColumnInfo(colFil);
    infoVals = infoVals.filter(rowInfo =>{
      // si la el valor de la columna es tiempo entonces quitar las horas para comparación
      if (typeof rowInfo[col_num1] === "object"){
        rowInfo[col_num1] = rowInfo[col_num1].setHours(0, 0, 0, 0)
      }
      return filterParams[colFil][1].some(param => {    
        if (filterParams[colFil][0]=== "="){
          return rowInfo[col_num1] == param
        } else if (filterParams[colFil][0] === "!=") {
          return rowInfo[col_num1] != param
        } else if (filterParams[colFil][0] == "includes"){
          return rowInfo[col_num1].includes(param)
        } else if (filterParams[colFil][0] == ">="){
          return rowInfo[col_num1] >= param
        }
        return false
      });
    })
  })
  // select only the desire columns
  var colsToShow = ws_config.getRange(rangeNameColsToShow).getValues().filter(String)
  var indexArraycolsToShow = colsToShow.map(col =>  _getColumnInfo(col[0])).filter(index => index !== undefined);
  // Map the filtered data to include only the desired columns
  infoVals = infoVals
  .sort((a, b) => new Date(b[1]) - new Date(a[1])) // Date sorting, descending
  .map(row =>
    indexArraycolsToShow.map(index => {
      const cellValue = row?.[index]; // Optional chaining to safely access row[index]
      // If the cell value is an object (Date), format it; otherwise, convert it to string
      return cellValue instanceof Date
        ? cellValue.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
        : String(cellValue);
    })
  );
  const resultArray = [colsToShow,infoVals]

  // regresa la tabla con la suma de valores
  if (sum){
    var colsToSum = ws_config.getRange("ColsToSum").getValues().filter(String).flat()
    var headerLen = colsToShow.length
    var flatColsToShow = colsToShow.flat()
    var totalArray = []
    var indexToInsert = []
    infoVals.forEach(row =>{
      let i = 1
      for (let x=0 ; x<headerLen ; x++){ 
        if (colsToSum.includes(flatColsToShow[x])){
          if (totalArray[i] == null){
            totalArray[i] = parseFloat(row[x])
          } else {
            totalArray[i] += parseFloat(row[x])
          }
          if (!indexToInsert.includes(x)){indexToInsert.push(x)}
          i +=1
        }
      }
    })
    var sumCompleteArray = new Array(headerLen).fill(null);
      indexToInsert.forEach((index, i) => {
        sumCompleteArray[index] = totalArray[i+1];
      });
      sumCompleteArray[0] = "Total"
      infoVals.push(sumCompleteArray)
  }
  // regresa los inputs para cargar en el elemento chips
  if (chipsReturn){
      //Get the list of the folios to add to chips
    const foliosArray = infoVals.map(sublist => [sublist[0], sublist[2]]);
    var foliosString = '{' + foliosArray.map(folioMVZ => `"${folioMVZ}":null`).join(',') + '}';
    resultArray.push(foliosString)

  }
  if (sumLabel){
    var resCalculatePagosPage = _returnSumCountPagosPage()
    var totalPorCobrarEfectivo = resCalculatePagosPage.sum
    var cuanqutyOfFolios = resCalculatePagosPage.count
    resultArray.push(totalPorCobrarEfectivo)
    resultArray.push(cuanqutyOfFolios)
  }
  return resultArray
}

function _filterParamsHasUserName (filterParams){
  for (let key in filterParams) {
    let paramArray = filterParams[key];
    paramArray.forEach((valueArray, index) => {
      if (Array.isArray(valueArray) && valueArray.includes("userName")) {
        valueArray[valueArray.indexOf("userName")] = userName;
      }
    });
  }
  return filterParams
}

function resumen_registro_diario_filtrado (beginDate,endDate, tipoPago){
  //var beginDate = ''//'2024-07-01'
  //var endDate =  ''
  //var tipoPago = 'Todos'
  if (beginDate == ''){ // si es la primera carga de la pag la variable viene vacia
    startDateToFilter = new Date().setHours(0, 0, 0, 0)
  } else {
    var splitStartDate = beginDate.split("-")
    startDateToFilter = new Date (splitStartDate[0],splitStartDate[1]-1,splitStartDate[2]).setHours(0, 0, 0, 0)
  }
  if (endDate != ''){
    var splitEndDate = endDate.split("-")
    endDateToFilter = new Date (splitEndDate[0],splitEndDate[1]-1,splitEndDate[2]).setHours(0, 0, 0, 0)
  }
  var vals = ws_info.getDataRange().getValues();
  vals.shift()
  var col_num1 = _getColumnInfo("Fecha de Servicio");
  var col_num2 = _getColumnInfo("Recolector");
  var col_num3 = _getColumnInfo("Pago");
  vals = vals.filter(v =>{
    if (tipoPago != 'Todos' && endDate != ''){
      return v[col_num1].setHours(0, 0, 0, 0) >= startDateToFilter && v[col_num1].setHours(0, 0, 0, 0) <= endDateToFilter && v[col_num2] == userName && v[col_num3] == tipoPago
    }
    if (tipoPago == 'Todos' && endDate != ''){
      return v[col_num1].setHours(0, 0, 0, 0) >= startDateToFilter && v[col_num1].setHours(0, 0, 0, 0) <= endDateToFilter && v[col_num2] == userName
    }
    if (tipoPago == 'Todos' && endDate == ''){
      return v[col_num1].setHours(0, 0, 0, 0) === startDateToFilter && v[col_num2] == userName
    }
    if (tipoPago != 'Todos' && endDate == ''){
      return v[col_num1].setHours(0, 0, 0, 0) === startDateToFilter && v[col_num2] == userName && v[col_num3] == tipoPago
    }
    return false
  })                    
  var resArray = []
  var colsToSum = ['Total de Servicio','Pagado Servicio', 'Por Cobrar Servicio', 'Total Producto','Pagado Producto','Por Cobrar Producto', 'Total Valor', 'Total Pagado','Total Por Cobrar'];
  var indexColsToSum = colsToSum.map(v => _getColumnInfo(v))
  //create and preprare sum Total Row
  const listOfAllSum = new Array(13).fill(0);
  listOfAllSum[0]= ''
  listOfAllSum[1]= ''
  listOfAllSum[2]= ''
  listOfAllSum[3]= 'Total'
  var it = 0
  // on the vals array, select only the columns from the config page
  var colsToShow = ws_config.getRange("RangoColsToShowResumenDiario").getValues().filter(String)
  var indexArray = colsToShow.map(v => (_getColumnInfo(v[0]) !== -1) ? _getColumnInfo(v[0]) : undefined).filter(v => v !== undefined);
  vals.forEach(function (sublist){
    it =0
    var temp = []
    indexArray.forEach(function(index){ 
      if (index >= 0 && index < sublist.length){
        if (typeof sublist[index] === "object"){
          sublist[index] = sublist[index].toLocaleDateString('es-MX',{day: '2-digit',month: 'short',year: 'numeric'})
        } else if (indexColsToSum.includes(index) && typeof sublist[index] == 'number'){       
          listOfAllSum[it] += sublist[index]
        }
        temp.push(String(sublist[index]))
      }
      it +=1
    })
    resArray.push(temp)
  })
  listOfAllSum.push('')
  resArray.push(listOfAllSum)
  return [colsToShow.flat(),resArray]
}
function uploadImageToDrive (data,fileName, mimeType){
  // Get the folder by its ID (or use FolderApp to create a new folder)
  try{
    var folderId = '1YtpDcz7ryCiKptPglw8N293z7nkYwrEa';
    var everyPhoto = DriveApp.getFolderById(folderId).getFiles();
    while (everyPhoto.hasNext()) {
      let photo = everyPhoto.next();
      Logger.log(photo.getName())
      if(photo.getName() == fileName){
        Logger.log(photo.getUrl())
        return
      }
    }
    var folder = DriveApp.getFolderById(folderId);
    var decodeData = Utilities.base64Decode(data)
    var blob = Utilities.newBlob(decodeData, mimeType, fileName);
    var file = folder.createFile(blob);
    var fileUrl = file.getUrl();

    var listFolios = ws_info.getRange(2,1,ws_info.getLastRow(),1).getValues().map(function(r){return r[0];});
    var position = listFolios.indexOf(fileName);
    if (position > -1){
      ws_info.getRange(position+2,_getColumnInfo("Archivo Imagen")+1).setValue(fileUrl)
    } else {
      return new Error("Folio no encontrado para asignar URL de imagen")
    }
    return true
  } catch (e) {
    var errorMessage = 'An error occurred: ' + e.message;
      _sendErrorNotification(userName,"NA","la función uploadImageToDrive",errorMessage)
    return fileName
  }
}