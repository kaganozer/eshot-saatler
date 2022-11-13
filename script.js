class DurakIsimleri extends React.Component {
    constructor(props) {
        super(props);
        this.state = { durakGidis: props.durakGidis, durakDonus: props.durakDonus };
    }
    render() {
        return (
            <thead>
                <tr>
                    <th>{this.state.durakGidis}</th>
                    <th>{this.state.durakDonus}</th>
                </tr>
            </thead>
        );
    }
}

class HareketSaati extends React.Component {
    constructor(props) {
        super(props);
        this.state = { saatGidis: props.saatGidis, saatDonus: props.saatDonus };
    }
    render() {
        return (
            <tr>
                <td>{this.state.saatGidis}</td>
                <td>{this.state.saatDonus}</td>
            </tr>
        ); 
    }
}

class HareketSaatleri extends React.Component {
    constructor(props) {
        super(props);
        this.state = { saatler: props.saatler };
    }
    render() {
        return (
            <tbody>
                {this.state.saatler.map((saat, index) => <HareketSaati key={index} saatGidis={saat.saatGidis} saatDonus={saat.saatDonus}/>)}
            </tbody>
        ); 
    }
}

class OtobusSaatleri extends React.Component {
    constructor(props) {
        super(props);
        this.state = { duraklar: props.duraklar, saatler: props.saatler }
    }
    render() {
        return (
            <table>
                <DurakIsimleri durakGidis={this.state.duraklar.durakGidis} durakDonus={this.state.duraklar.durakDonus}/>
                <HareketSaatleri saatler={this.state.saatler}/>
            </table>
        );
    }
}

class OtobusTables extends React.Component {
    constructor(props) {
        super(props);
        this.state = { otobusler: props.otobusler }
    }
    render() {
        return (
            <div>
                {
                    this.state.otobusler.map(otobus => {
                        if (otobus.error) {
                            return (
                                <div key={otobus.name}>{otobus.error}</div>
                            )
                        }
                        return (
                            <details key={otobus.name}>
                                <summary>{otobus.name}</summary>
                                <OtobusSaatleri duraklar={otobus.duraklar} saatler={otobus.saatler}/>
                            </details>
                        );
                    })
                }
            </div>
        );
    }
}

const currentTime = new Date();
const currentDayNumber = currentTime.getDay();
const currentDay = currentDayNumber == 0 ? "Pazar" : (currentDayNumber == 6 ? "Ctesi" : "Hici");

const rangeStart = currentTime.getTime() - (15 * 60 * 1000);
const rangeEnd = currentTime.getTime() + (120 * 60 * 1000);

const hour = (currentTime.getHours() < 10 ? "0" : "") + currentTime.getHours();
const minute = (currentTime.getMinutes() < 10 ? "0" : "") + currentTime.getMinutes();
const day = new Intl.DateTimeFormat("tr-TR", { weekday: "long" }).format(currentTime);

document.querySelector(".current-time").textContent = `${hour}:${minute} - ${day}`;

const checkRange = (time, rangeStart, rangeEnd) => {
    const [ hour, minute ] = time.split(":").map(n => Number(n));
    const otobusSaat = new Date();
    otobusSaat.setHours(hour, minute);
    return (rangeStart <= otobusSaat.getTime()) && (otobusSaat.getTime() <= rangeEnd);
};

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const getDataSeries = async items => {
    const results = [];
    for (let index = 0; index < items.length; index++) {
        await sleep(500);
        const otobus = items[index]

        const hatDuraklari = await fetch(`https://openapi.izmir.bel.tr/api/eshot/hatduraklari/${otobus}/1`).then(data => data.json());
        const hareketSaatleri = await fetch(`https://openapi.izmir.bel.tr/api/eshot/hareketsaatleri/${otobus}`).then(data => data.json());

        if (hatDuraklari["Duraklar"].length) {
            const duraklar = { durakGidis: hatDuraklari["Duraklar"][0]["Adi"], durakDonus: hatDuraklari["Duraklar"].at(-1)["Adi"] };
            const gidisSaatler = hareketSaatleri[`HareketSaatleri${currentDay}`]
                .filter(sefer => checkRange(sefer["GidisSaat"], rangeStart, rangeEnd))
                .map(sefer => sefer["GidisSaat"]);
            const donusSaatler = hareketSaatleri[`HareketSaatleri${currentDay}`]
                .filter(sefer => checkRange(sefer["DonusSaat"], rangeStart, rangeEnd))
                .map(sefer => sefer["DonusSaat"]);
            const saatler = [];
            const arrayMax = (gidisSaatler.length > donusSaatler.length) ? gidisSaatler : donusSaatler;
            arrayMax.forEach((e, i) => {
                saatler.push({
                    saatGidis: gidisSaatler[i] ? gidisSaatler[i] : "-",
                    saatDonus: donusSaatler[i] ? donusSaatler[i] : "-",
                });
            })
            
            results.push({
                name: otobus,
                duraklar: duraklar,
                saatler: saatler
            });
        } else {
            results.push({
                name: otobus,
                error: "Girilen otobüs bulunamadı."
            });
        }
    }
    return results;
};

const otobusler = ["128", "428", "751", "346", "446"];
getDataSeries(otobusler).then(data => {
    const domContainer = document.querySelector(".otobus-saatleri");
    const root = ReactDOM.createRoot(domContainer);
    root.render(<OtobusTables otobusler={data}/>);
});

const input = document.querySelector("input#otobus-search");
const button = document.querySelector("button.search");

const otobusAra = (e) => {
    input.blur();
    const value = input.value.trim();
    if (value && Number(value)) {
        const domContainerSearch = document.querySelector(".otobus-saatleri.search");
        const rootSearch = ReactDOM.createRoot(domContainerSearch);
        rootSearch.render(<div><div className="loader">Yükleniyor...</div></div>);
        getDataSeries([value]).then(data => {
            rootSearch.render(<OtobusTables otobusler={data}/>);
        });
    }
}

button.addEventListener("click", otobusAra);
input.addEventListener("keydown", (e) => {if (e.keyCode === 13) {otobusAra(e);}});
