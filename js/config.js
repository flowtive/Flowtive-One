/* ════════════════════════════════════════════════════════════════════════
   Flowtive One — Config & data tables (no functions, just constants)
   Loaded first; everything else assumes these globals exist.
   ════════════════════════════════════════════════════════════════════════ */

var TEAM_PASSWORD = '!FlowtiveOne2026#';

var TEAM_ACCOUNTS = [
  {email:'theemon.me@gmail.com',    name:'Emran'},
  {email:'miltonsarkar333111@gmail.com',   name:'Milton'},
  {email:'deepeffect6@gmail.com',   name:'Mugdho'},
  {email:'gowithashik@gmail.com',    name:'Ashik'},
  {email:'sadmanhasan680@gmail.com',   name:'Sadman'},
  {email:'rafikriyan07@gmail.com',    name:'Rafik'},
];

var currentUser = null;

var US_STATES=["Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut","Delaware","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa","Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan","Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada","New Hampshire","New Jersey","New Mexico","New York","North Carolina","North Dakota","Ohio","Oklahoma","Oregon","Pennsylvania","Rhode Island","South Carolina","South Dakota","Tennessee","Texas","Utah","Vermont","Virginia","Washington","West Virginia","Wisconsin","Wyoming"];

var STATE_ABBREV={
  "Alabama":"AL","Alaska":"AK","Arizona":"AZ","Arkansas":"AR","California":"CA",
  "Colorado":"CO","Connecticut":"CT","Delaware":"DE","Florida":"FL","Georgia":"GA",
  "Hawaii":"HI","Idaho":"ID","Illinois":"IL","Indiana":"IN","Iowa":"IA",
  "Kansas":"KS","Kentucky":"KY","Louisiana":"LA","Maine":"ME","Maryland":"MD",
  "Massachusetts":"MA","Michigan":"MI","Minnesota":"MN","Mississippi":"MS","Missouri":"MO",
  "Montana":"MT","Nebraska":"NE","Nevada":"NV","New Hampshire":"NH","New Jersey":"NJ",
  "New Mexico":"NM","New York":"NY","North Carolina":"NC","North Dakota":"ND","Ohio":"OH",
  "Oklahoma":"OK","Oregon":"OR","Pennsylvania":"PA","Rhode Island":"RI","South Carolina":"SC",
  "South Dakota":"SD","Tennessee":"TN","Texas":"TX","Utah":"UT","Vermont":"VT",
  "Virginia":"VA","Washington":"WA","West Virginia":"WV","Wisconsin":"WI","Wyoming":"WY"
};

var STATE_CITIES={
  "Alabama":["Montgomery","Birmingham","Huntsville","Mobile","Tuscaloosa","Hoover","Dothan","Auburn","Decatur","Madison","Florence","Gadsden","Vestavia Hills","Prattville","Phenix City","Alabaster","Bessemer","Enterprise","Opelika","Homewood"],
  "Alaska":["Anchorage","Fairbanks","Juneau","Sitka","Ketchikan","Wasilla","Kenai","Kodiak","Bethel","Palmer","Homer","Unalaska","Barrow","Soldotna","Valdez","Nome","Kotzebue","Seward","Wrangell","Petersburg"],
  "Arizona":["Phoenix","Tucson","Mesa","Chandler","Scottsdale","Tempe","Gilbert","Glendale","Peoria","Surprise","Yuma","Avondale","Flagstaff","Goodyear","Lake Havasu City","Buckeye","Casa Grande","Sierra Vista","Maricopa","Oro Valley"],
  "Arkansas":["Little Rock","Fort Smith","Fayetteville","Springdale","Jonesboro","North Little Rock","Conway","Rogers","Pine Bluff","Bentonville","Hot Springs","Benton","Texarkana","Sherwood","Jacksonville","Russellville","Bella Vista","West Memphis","Paragould","Cabot"],
  "California":["Los Angeles","San Diego","San Jose","San Francisco","Fresno","Sacramento","Long Beach","Oakland","Bakersfield","Anaheim","Santa Ana","Riverside","Stockton","Irvine","Chula Vista","Fremont","San Bernardino","Modesto","Fontana","Moreno Valley","Glendale","Huntington Beach","Santa Clarita","Garden Grove","Oceanside","Rancho Cucamonga","Santa Rosa","Ontario","Elk Grove","Corona"],
  "Colorado":["Denver","Colorado Springs","Aurora","Fort Collins","Lakewood","Thornton","Arvada","Westminster","Pueblo","Centennial","Boulder","Highlands Ranch","Greeley","Longmont","Loveland","Broomfield","Castle Rock","Commerce City","Parker","Northglenn"],
  "Connecticut":["Bridgeport","New Haven","Stamford","Hartford","Waterbury","Norwalk","Danbury","New Britain","West Hartford","Greenwich","Hamden","Bristol","Meriden","Manchester","West Haven","Milford","Stratford","East Hartford","Middletown","Shelton"],
  "Delaware":["Wilmington","Dover","Newark","Middletown","Smyrna","Milford","Seaford","Georgetown","Elsmere","New Castle","Millsboro","Laurel","Harrington","Camden","Clayton","Lewes","Milton","Selbyville","Bridgeville","Townsend"],
  "Florida":["Jacksonville","Miami","Tampa","Orlando","St. Petersburg","Hialeah","Tallahassee","Fort Lauderdale","Port St. Lucie","Cape Coral","Pembroke Pines","Hollywood","Miramar","Gainesville","Coral Springs","Clearwater","Miami Gardens","Pompano Beach","West Palm Beach","Lakeland","Davie","Boca Raton","Deltona","Plantation","Sunrise","Palm Bay","Largo","Melbourne","Deerfield Beach","Boynton Beach"],
  "Georgia":["Atlanta","Augusta","Columbus","Macon","Savannah","Athens","Sandy Springs","Roswell","Johns Creek","Albany","Warner Robins","Alpharetta","Marietta","Valdosta","Smyrna","Dunwoody","Rome","East Point","Peachtree City","Milton"],
  "Hawaii":["Honolulu","Pearl City","Hilo","Kailua","Waipahu","Kaneohe","Mililani Town","Kahului","Kihei","Kailua-Kona","Wailuku","Kapaa","Wahiawa","Waimalu","Nanakuli","Ewa Gentry","Halawa","Makakilo","Schofield Barracks","Lahaina"],
  "Idaho":["Boise","Nampa","Meridian","Idaho Falls","Pocatello","Caldwell","Coeur d'Alene","Twin Falls","Lewiston","Post Falls","Rexburg","Moscow","Eagle","Kuna","Ammon","Chubbuck","Hayden","Mountain Home","Blackfoot","Garden City"],
  "Illinois":["Chicago","Aurora","Joliet","Naperville","Rockford","Springfield","Elgin","Peoria","Champaign","Waukegan","Cicero","Bloomington","Arlington Heights","Evanston","Decatur","Schaumburg","Bolingbrook","Palatine","Skokie","Des Plaines","Orland Park","Tinley Park","Oak Lawn","Berwyn","Mount Prospect"],
  "Indiana":["Indianapolis","Fort Wayne","Evansville","South Bend","Carmel","Fishers","Bloomington","Hammond","Gary","Lafayette","Muncie","Terre Haute","Kokomo","Anderson","Noblesville","Greenwood","Elkhart","Mishawaka","Lawrence","Jeffersonville"],
  "Iowa":["Des Moines","Cedar Rapids","Davenport","Sioux City","Iowa City","Waterloo","Council Bluffs","Ames","West Des Moines","Dubuque","Ankeny","Urbandale","Cedar Falls","Marion","Bettendorf","Mason City","Marshalltown","Clinton","Burlington","Ottumwa"],
  "Kansas":["Wichita","Overland Park","Kansas City","Olathe","Topeka","Lawrence","Shawnee","Manhattan","Lenexa","Salina","Hutchinson","Leavenworth","Leawood","Dodge City","Garden City","Emporia","Derby","Prairie Village","Liberal","Junction City"],
  "Kentucky":["Louisville","Lexington","Bowling Green","Owensboro","Covington","Richmond","Georgetown","Florence","Elizabethtown","Henderson","Nicholasville","Jeffersontown","Frankfort","Paducah","Hopkinsville","Independence","Radcliff","Ashland","Madisonville","Murray"],
  "Louisiana":["New Orleans","Baton Rouge","Shreveport","Lafayette","Lake Charles","Kenner","Bossier City","Monroe","Alexandria","Metairie","New Iberia","Hammond","Slidell","Natchitoches","Houma","Central","Laplace","Ruston","Prairieville","Bayou Cane"],
  "Maine":["Portland","Lewiston","Bangor","South Portland","Auburn","Biddeford","Sanford","Augusta","Saco","Westbrook","Waterville","Brewer","Presque Isle","Bath","Caribou","Ellsworth","Old Town","Rockland","Belfast","Gardiner"],
  "Maryland":["Baltimore","Columbia","Germantown","Silver Spring","Waldorf","Glen Burnie","Ellicott City","Frederick","Dundalk","Rockville","Gaithersburg","Bethesda","Towson","Bowie","Aspen Hill","Wheaton","Bel Air","Annapolis","Hagerstown","College Park"],
  "Massachusetts":["Boston","Worcester","Springfield","Cambridge","Lowell","Brockton","New Bedford","Quincy","Lynn","Fall River","Newton","Somerville","Lawrence","Framingham","Haverhill","Waltham","Malden","Brookline","Plymouth","Taunton","Medford","Chicopee","Weymouth","Revere","Peabody"],
  "Michigan":["Detroit","Grand Rapids","Warren","Sterling Heights","Ann Arbor","Lansing","Flint","Dearborn","Livonia","Westland","Troy","Farmington Hills","Kalamazoo","Wyoming","Southfield","Rochester Hills","Taylor","Pontiac","St. Clair Shores","Royal Oak","Novi","Dearborn Heights","Battle Creek","Saginaw","Kentwood"],
  "Minnesota":["Minneapolis","Saint Paul","Rochester","Duluth","Bloomington","Brooklyn Park","Plymouth","Saint Cloud","Eagan","Woodbury","Coon Rapids","Eden Prairie","Burnsville","Blaine","Lakeville","Minnetonka","Apple Valley","Edina","St. Louis Park","Mankato","Moorhead","Shakopee","Maplewood","Cottage Grove","Richfield"],
  "Mississippi":["Jackson","Gulfport","Southaven","Hattiesburg","Biloxi","Meridian","Tupelo","Olive Branch","Greenville","Horn Lake","Pearl","Vicksburg","Brandon","Madison","Ridgeland","Clinton","Starkville","Columbus","Gautier","Laurel"],
  "Missouri":["Kansas City","St. Louis","Springfield","Columbia","Independence","Lee's Summit","O'Fallon","St. Joseph","St. Charles","Blue Springs","Joplin","Chesterfield","Jefferson City","Cape Girardeau","Florissant","St. Peters","Wentzville","University City","Ballwin","Kirkwood"],
  "Montana":["Billings","Missoula","Great Falls","Bozeman","Butte","Helena","Kalispell","Havre","Anaconda","Miles City","Belgrade","Livingston","Laurel","Whitefish","Lewistown","Sidney","Glendive","Hamilton","Polson","Cut Bank"],
  "Nebraska":["Omaha","Lincoln","Bellevue","Grand Island","Kearney","Fremont","Hastings","Norfolk","Columbus","North Platte","Papillion","La Vista","Scottsbluff","South Sioux City","Beatrice","Lexington","Gering","Alliance","York","Blair"],
  "Nevada":["Las Vegas","Henderson","Reno","North Las Vegas","Sparks","Carson City","Fernley","Elko","Mesquite","Boulder City","Fallon","Winnemucca","West Wendover","Ely","Yerington","Lovelock","Wells","Caliente","Carlin","Hawthorne"],
  "New Hampshire":["Manchester","Nashua","Concord","Derry","Dover","Rochester","Salem","Merrimack","Hudson","Londonderry","Keene","Bedford","Portsmouth","Goffstown","Laconia","Hampton","Milford","Durham","Exeter","Windham"],
  "New Jersey":["Newark","Jersey City","Paterson","Elizabeth","Edison","Woodbridge","Lakewood","Toms River","Hamilton","Trenton","Clifton","Camden","Brick","Cherry Hill","Passaic","Middletown","Union City","Old Bridge","East Orange","Bayonne","Franklin Township","North Bergen","Vineland","Union Township","Gloucester Township"],
  "New Mexico":["Albuquerque","Las Cruces","Rio Rancho","Santa Fe","Roswell","Farmington","Clovis","Hobbs","Alamogordo","Carlsbad","Gallup","Taos","Portales","Los Lunas","Artesia","Lovington","Silver City","Espanola","Anthony","Bernalillo"],
  "New York":["New York City","Buffalo","Rochester","Yonkers","Syracuse","Albany","New Rochelle","Mount Vernon","Schenectady","Utica","White Plains","Hempstead","Troy","Niagara Falls","Binghamton","Freeport","Valley Stream","Long Beach","Spring Valley","Rome","Ithaca","Poughkeepsie","Cheektowaga","Brookhaven","Amherst"],
  "North Carolina":["Charlotte","Raleigh","Greensboro","Durham","Winston-Salem","Fayetteville","Cary","Wilmington","High Point","Concord","Asheville","Gastonia","Jacksonville","Chapel Hill","Rocky Mount","Huntersville","Apex","Burlington","Kannapolis","Wilson","Greenville","Hickory","Monroe","Mooresville","Salisbury"],
  "North Dakota":["Fargo","Bismarck","Grand Forks","Minot","West Fargo","Williston","Dickinson","Mandan","Jamestown","Wahpeton","Devils Lake","Valley City","Grafton","Lincoln","Beulah","Rugby","Watford City","Bottineau","Hazen","Lisbon"],
  "Ohio":["Columbus","Cleveland","Cincinnati","Toledo","Akron","Dayton","Parma","Canton","Youngstown","Lorain","Hamilton","Springfield","Kettering","Elyria","Lakewood","Cuyahoga Falls","Euclid","Middletown","Mansfield","Newark","Mentor","Cleveland Heights","Beavercreek","Strongsville","Dublin"],
  "Oklahoma":["Oklahoma City","Tulsa","Norman","Broken Arrow","Edmond","Lawton","Moore","Midwest City","Enid","Stillwater","Owasso","Bartlesville","Muskogee","Shawnee","Jenks","Bixby","Ardmore","Ponca City","Yukon","Duncan"],
  "Oregon":["Portland","Salem","Eugene","Gresham","Hillsboro","Beaverton","Bend","Medford","Springfield","Corvallis","Albany","Tigard","Lake Oswego","Keizer","Grants Pass","Oregon City","McMinnville","Redmond","Tualatin","West Linn"],
  "Pennsylvania":["Philadelphia","Pittsburgh","Allentown","Erie","Reading","Scranton","Bethlehem","Lancaster","Harrisburg","Altoona","York","State College","Wilkes-Barre","Chester","Easton","Hazleton","Lebanon","Norristown","Williamsport","McKeesport"],
  "Rhode Island":["Providence","Cranston","Warwick","Pawtucket","East Providence","Woonsocket","Coventry","North Providence","Cumberland","West Warwick","Johnston","North Kingstown","South Kingstown","Newport","Bristol","Westerly","Central Falls","Smithfield","Lincoln","Barrington"],
  "South Carolina":["Columbia","Charleston","North Charleston","Mount Pleasant","Rock Hill","Greenville","Summerville","Goose Creek","Hilton Head Island","Sumter","Florence","Spartanburg","Myrtle Beach","Aiken","Anderson","Greer","Mauldin","Simpsonville","Conway","Lexington"],
  "South Dakota":["Sioux Falls","Rapid City","Aberdeen","Brookings","Watertown","Mitchell","Yankton","Pierre","Huron","Spearfish","Vermillion","Brandon","Box Elder","Sturgis","Madison","Dell Rapids","Tea","Harrisburg","Hot Springs","Lead"],
  "Tennessee":["Nashville","Memphis","Knoxville","Chattanooga","Clarksville","Murfreesboro","Franklin","Jackson","Johnson City","Bartlett","Hendersonville","Kingsport","Collierville","Smyrna","Cleveland","Brentwood","Germantown","Columbia","Spring Hill","La Vergne"],
  "Texas":["Houston","San Antonio","Dallas","Austin","Fort Worth","El Paso","Arlington","Corpus Christi","Plano","Laredo","Lubbock","Irving","Garland","Frisco","McKinney","Amarillo","Grand Prairie","Brownsville","Killeen","Pasadena","Mesquite","McAllen","Midland","Denton","Waco","Carrollton","Beaumont","Abilene","Odessa","Round Rock"],
  "Utah":["Salt Lake City","West Valley City","Provo","West Jordan","Orem","Sandy","Ogden","St. George","Layton","South Jordan","Lehi","Millcreek","Taylorsville","Logan","Murray","Draper","Bountiful","Riverton","Herriman","Spanish Fork"],
  "Vermont":["Burlington","South Burlington","Rutland","Barre","Montpelier","Winooski","St. Albans","Newport","Vergennes","Middlebury","Springfield","Brattleboro","Bennington","St. Johnsbury","Morrisville","Essex Junction","Swanton","Johnson","Lyndonville","White River Junction"],
  "Virginia":["Virginia Beach","Norfolk","Chesapeake","Richmond","Arlington","Newport News","Alexandria","Hampton","Roanoke","Portsmouth","Suffolk","Lynchburg","Harrisonburg","Charlottesville","Fredericksburg","Danville","Manassas","Petersburg","Leesburg","Blacksburg"],
  "Washington":["Seattle","Spokane","Tacoma","Vancouver","Bellevue","Kent","Everett","Renton","Kirkland","Spokane Valley","Bellingham","Kennewick","Federal Way","Yakima","Redmond","Marysville","Pasco","South Hill","Shoreline","Richland"],
  "West Virginia":["Charleston","Huntington","Morgantown","Parkersburg","Wheeling","Weirton","Fairmont","Martinsburg","Beckley","Clarksburg","South Charleston","St. Albans","Vienna","Bluefield","Moundsville","Bridgeport","Oak Hill","Dunbar","Elkins","Princeton"],
  "Wisconsin":["Milwaukee","Madison","Green Bay","Kenosha","Racine","Appleton","Waukesha","Oshkosh","Eau Claire","Janesville","West Allis","La Crosse","Sheboygan","Wauwatosa","Fond du Lac","New Berlin","Wausau","Brookfield","Greenfield","Beloit"],
  "Wyoming":["Cheyenne","Casper","Laramie","Gillette","Rock Springs","Sheridan","Green River","Evanston","Riverton","Jackson","Cody","Rawlins","Lander","Torrington","Powell","Douglas","Worland","Buffalo","Wheatland","Thermopolis"]
};

var IND_STATE_PRIORITY={
  "Agency":{P1:["New York","California","Illinois","Texas","Florida"],P2:["Washington","Georgia","Massachusetts","Colorado","North Carolina","Virginia","Arizona","Michigan","Minnesota","Oregon"]},
  "Law Firms":{P1:["New York","California","Texas","Illinois","Florida","Massachusetts","Virginia"],P2:["Georgia","Pennsylvania","Ohio","Michigan","New Jersey","North Carolina","Arizona","Colorado","Maryland","Washington"]},
  "Consulting":{P1:["New York","Illinois","California","Massachusetts","Virginia"],P2:["Texas","Georgia","Washington","Florida","Pennsylvania","New Jersey","Maryland","Colorado","North Carolina","Ohio"]},
  "SaaS":{P1:["California","New York","Texas","Washington","Massachusetts"],P2:["Colorado","Georgia","Illinois","Florida","Virginia","North Carolina","Michigan","Oregon","Utah","Arizona"]},
  "Startup":{P1:["California","New York","Texas","Florida","Massachusetts"],P2:["Colorado","Washington","Georgia","Illinois","Virginia","North Carolina","Arizona","Nevada","Oregon","Michigan"]},
  "Restaurant & Food":{P1:["New York","California","Illinois","Florida","Texas"],P2:["Georgia","Nevada","Tennessee","Louisiana","Massachusetts","Washington","Colorado","Pennsylvania","Virginia","North Carolina"]},
  "Real Estate":{P1:["New York","California","Florida","Texas","Georgia"],P2:["Arizona","Nevada","Colorado","Washington","North Carolina","Illinois","Virginia","Pennsylvania","Tennessee","Michigan"]},
  "Travel & Tourism":{P1:["Florida","Nevada","New York","California","Hawaii"],P2:["Colorado","Tennessee","Texas","Arizona","Louisiana","Illinois","Georgia","Washington","Massachusetts","Virginia"]},
  "Architecture & Interior":{P1:["New York","California","Florida","Illinois","Texas"],P2:["Washington","Massachusetts","Georgia","Colorado","Virginia","Arizona","Nevada","Pennsylvania","North Carolina","Michigan"]},
  "Tech & IT Services":{P1:["California","New York","Washington","Texas","Massachusetts"],P2:["Virginia","Colorado","Georgia","Illinois","Florida","North Carolina","Michigan","Arizona","Oregon","Pennsylvania"]},
  "Photography & Creative":{P1:["New York","California","Illinois","Texas","Florida"],P2:["Tennessee","Georgia","Colorado","Washington","Oregon","Massachusetts","Nevada","Virginia","North Carolina","Arizona"]},
  "Beauty & Wellness":{P1:["California","New York","Florida","Texas","Georgia"],P2:["Arizona","Nevada","Colorado","Tennessee","Illinois","Virginia","North Carolina","Washington","Massachusetts","Michigan"]},
  "Healthcare":{P1:["New York","California","Texas","Florida","Massachusetts"],P2:["Illinois","Pennsylvania","Georgia","Ohio","North Carolina","Michigan","Virginia","Washington","Minnesota","Maryland"]},
  "Dental & Cosmetic":{P1:["New York","California","Florida","Texas","Illinois"],P2:["Georgia","Arizona","Nevada","Colorado","Virginia","North Carolina","Tennessee","Washington","Massachusetts","Michigan"]},
  "Hospitality & Hotels":{P1:["Nevada","Florida","New York","California","Tennessee"],P2:["Texas","Illinois","Georgia","Louisiana","Colorado","Arizona","Virginia","Massachusetts","Washington","South Carolina"]},
  "Marketing & Advertising":{P1:["New York","California","Illinois","Texas","Georgia"],P2:["Florida","Washington","Massachusetts","Colorado","Virginia","North Carolina","Michigan","Pennsylvania","New Jersey","Arizona"]},
  "Finance & Accounting":{P1:["New York","Illinois","California","Massachusetts","North Carolina"],P2:["Texas","Florida","Connecticut","Virginia","Georgia","Pennsylvania","New Jersey","Ohio","Colorado","Maryland"]},
  "Fitness & Gym":{P1:["California","New York","Florida","Texas","Colorado"],P2:["Georgia","Illinois","Arizona","Nevada","Tennessee","Washington","North Carolina","Massachusetts","Virginia","Michigan"]},
};

var WHY={
  "Agency":{"California":"Silicon Valley and LA agencies","New York":"Madison Ave and NYC digital agencies","Illinois":"Chicago Fortune 500 market","Texas":"Austin and Dallas growing","Florida":"Miami creative agencies"},
  "Law Firms":{"New York":"BigLaw capital of the world","California":"Tech IP and entertainment law","Texas":"Energy and corporate law","Illinois":"Chicago commercial hub","Florida":"Miami international firms"},
  "Consulting":{"New York":"MBB and Big 4 HQs","Illinois":"McKinsey founding city","California":"Tech strategy consulting","Massachusetts":"Bain HQ","Virginia":"Government consulting"},
  "SaaS":{"California":"Global SaaS capital","New York":"Enterprise SaaS market","Texas":"Austin booming hub","Washington":"Amazon and Microsoft ecosystem","Massachusetts":"B2B SaaS and fintech"},
  "Startup":{"California":"Highest funded startup density","New York":"Second largest ecosystem","Texas":"Austin magnetic for founders","Florida":"Miami emerging hub","Massachusetts":"Boston deep tech"},
  "Restaurant & Food":{"New York":"World-class dining","California":"Celebrity chef culture","Illinois":"Chicago food scene","Florida":"Miami luxury dining","Texas":"Houston diverse culinary"},
  "Real Estate":{"New York":"Largest US market","California":"LA and SF luxury","Florida":"Miami booming luxury","Texas":"Dallas and Houston","Georgia":"Atlanta fastest growing"},
  "Travel & Tourism":{"Florida":"Top US destination","Nevada":"Las Vegas hospitality capital","New York":"Top city tourism","California":"LA, SF and wine country","Hawaii":"World-class island destination"},
  "Architecture & Interior":{"New York":"Design capital","California":"Hollywood luxury","Florida":"Miami luxury condo design","Illinois":"Chicago architectural heritage","Texas":"Dallas and Houston luxury"},
  "Tech & IT Services":{"California":"Silicon Valley epicenter","New York":"Enterprise IT","Washington":"Amazon and Microsoft HQ","Texas":"Austin fast-growing","Massachusetts":"Boston biotech and IT"},
  "Photography & Creative":{"New York":"Fashion and commercial capital","California":"Entertainment and film","Illinois":"Chicago commercial","Texas":"Dallas and Austin creative","Florida":"Miami luxury lifestyle"},
  "Beauty & Wellness":{"California":"LA wellness capital","New York":"Luxury beauty market","Florida":"Miami medical aesthetics","Texas":"Dallas med spa surge","Georgia":"Atlanta growing market"},
  "Healthcare":{"New York":"Largest US private market","California":"LA private clinics","Texas":"Houston Texas Medical Center","Florida":"Miami and Orlando clinics","Massachusetts":"Boston world-renowned hospitals"},
  "Dental & Cosmetic":{"New York":"Cosmetic dentistry capital","California":"Hollywood smile culture","Florida":"Miami dental tourism","Texas":"Dallas fast-growing","Illinois":"Chicago large market"},
  "Hospitality & Hotels":{"Nevada":"Las Vegas hospitality capital","Florida":"Miami and Orlando luxury","New York":"Boutique hotel boom","California":"LA luxury hotels","Tennessee":"Nashville fastest growing"},
  "Marketing & Advertising":{"New York":"Madison Avenue capital","California":"LA entertainment marketing","Illinois":"Chicago third largest ad market","Texas":"Dallas and Austin","Georgia":"Atlanta Coca-Cola culture"},
  "Finance & Accounting":{"New York":"Wall Street global capital","Illinois":"Chicago futures hub","California":"San Francisco fintech","Massachusetts":"Boston wealth management","North Carolina":"Charlotte Bank of America HQ"},
  "Fitness & Gym":{"California":"LA fitness and wellness capital","New York":"Boutique fitness boom","Florida":"Miami beach culture","Texas":"Dallas and Austin health culture","Colorado":"Denver outdoor fitness"},
};

var MEMBERS=[
  {name:"Emran",  color:"#406093",inds:["Agency","Law Firms","Consulting"]},
  {name:"Milton", color:"#2980B9",inds:["SaaS","Startup","Restaurant & Food"]},
  {name:"Mugdho", color:"#8E44AD",inds:["Marketing & Advertising","Finance & Accounting","Fitness & Gym"]},
  {name:"Ashik",  color:"#E67E22",inds:["Tech & IT Services","Photography & Creative","Beauty & Wellness"]},
  {name:"Sadman", color:"#E74C3C",inds:["Healthcare","Dental & Cosmetic","Hospitality & Hotels"]},
  {name:"Rafik",  color:"#1ABC9C",inds:["Real Estate","Travel & Tourism","Architecture & Interior"]},
];

var ALL_INDUSTRIES = MEMBERS.reduce(function(a,m){return a.concat(m.inds);},[]);
var doneData={};
var charts={};
var appInitialized = false;

/* ── Firebase config ─────────────────────────────────────────────
   SETUP INSTRUCTIONS (2 min):
   1. Go to https://console.firebase.google.com
   2. Create a new project (e.g. "flowtive-leads")
   3. Add a Web app, copy the firebaseConfig object
   4. Go to Build → Realtime Database → Create database → Start in test mode
   5. Replace the values below with your own config

   ⚠️  SECURITY — IMPORTANT (Fix 1):
   This file is shared with the team so the Firebase config is visible to
   anyone who opens it. The API key alone is NOT enough to lock down your
   database — you MUST replace the default "test mode" rules with these:

   Go to: Firebase Console → Realtime Database → Rules → paste this:

   {
     "rules": {
       ".read":  "auth == null",
       ".write": "auth == null",
       "flowtive_progress": { ".read": true, ".write": true },
       "flowtive_status":   { ".read": true, ".write": true },
       "flowtive_notes":    { ".read": true, ".write": true },
       "flowtive_activity": { ".read": true, ".write": true },
       "flowtive_avatars":  { ".read": true, ".write": true },
       "flowtive_presence": { ".read": true, ".write": true },
       "flowtive_email_templates": { ".read": true, ".write": true }
     }
   }

   This restricts access to only the paths this app actually uses.
   The default test-mode rule grants full read/write to the ENTIRE database
   to anyone on the internet until it expires.
   ─────────────────────────────────────────────────────────────── */
var FIREBASE_CONFIG = {
  apiKey:            "AIzaSyCiNEOVvnGoU7c9UH57tog-VP8YgICLRpM",
  authDomain:        "flowtive-leads.firebaseapp.com",
  databaseURL:       "https://flowtive-leads-default-rtdb.firebaseio.com",
  projectId:         "flowtive-leads",
  storageBucket:     "flowtive-leads.firebasestorage.app",
  messagingSenderId: "883655434217",
  appId:             "1:883655434217:web:3f47c12f7414902d14f578",
  measurementId:     "G-D3Q55SQBPT"
};

var firebaseApp = null;
var firebaseDb  = null;
var firebaseReady = false;


/* ── Data stores ── */
var notesData = {};
var claimsData = {};
var statusData = {};
var activityLog = [];   // local cache, synced from Firebase
var _noteContext = null;
var _activityListener = null;

function saveExtras(){
  try{
    localStorage.setItem('flowtive_notes_v1',  JSON.stringify(notesData));
    localStorage.setItem('flowtive_status_v1', JSON.stringify(statusData));
    localStorage.setItem('flowtive_activity_fallback', JSON.stringify(activityLog.slice(0,100)));
    if(firebaseReady){
      firebaseDb.ref('flowtive_status').set(statusData).catch(function(e){
        console.warn('Status Firebase sync failed:', e.message);
      });
      // Fix 2: Sync notes to Firebase so all team members can see them
      firebaseDb.ref('flowtive_notes').set(notesData).catch(function(e){
        console.warn('Notes Firebase sync failed:', e.message);
      });
    }
  }catch(e){}
}

