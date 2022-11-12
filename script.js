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

const otobusler = ["128", "428", "346", "446", "751", "820"];
const otobusPromises = otobusler.map(async (otobus) => {
    return Promise.all([
        fetch(`https://openapi.izmir.bel.tr/api/eshot/hatduraklari/${otobus}/1`).then(data => data.json()),
        fetch(`https://openapi.izmir.bel.tr/api/eshot/hareketsaatleri/${otobus}`).then(data => data.json())
    ]).then(([hatDuraklari, hareketSaatleri]) => {
        const currentTime = new Date();
        const currentDayNumber = currentTime.getDay();
        const currentDay = currentDayNumber == 0 ? "Pazar" : (currentDayNumber == 6 ? "Ctesi" : "Hici");

        const timeElement = document.querySelector(".current-time");
        timeElement.textContent = `${currentTime.getHours()}:${currentTime.getMinutes()} - ${new Intl.DateTimeFormat('tr-TR', { weekday: "long" }).format(currentTime)}`;
        
        const duraklar = { durakGidis: hatDuraklari["Duraklar"][0]["Adi"], durakDonus: hatDuraklari["Duraklar"].at(-1)["Adi"] };
        const saatler = hareketSaatleri[`HareketSaatleri${currentDay}`].filter(sefer => {
            const rangeStart = currentTime.getTime() - 600000;
            const rangeEnd = currentTime.getTime() + 7200000;
            const [ hour, minute ] = sefer["DonusSaat"].split(":").map(n => Number(n));
            const otobusSaat = new Date();
            otobusSaat.setHours(hour, minute);

            // return true;
            return (rangeStart <= otobusSaat.getTime()) && (otobusSaat.getTime() <= rangeEnd);
        }).map(sefer => { return { saatGidis: sefer["GidisSaat"], saatDonus: sefer["DonusSaat"] } });  
        return {
            name: otobus,
            duraklar: duraklar,
            saatler: saatler
        };
    }).catch(() => false);
});

const domContainer = document.querySelector(`.otobus-saatleri`);
const root = ReactDOM.createRoot(domContainer);
Promise.all(otobusPromises).then(otobusData => {
    root.render(<OtobusTables otobusler={otobusData.filter(e => Boolean(e))}/>);
});

navigator.geolocation.getCurrentPosition(
    (e) => {console.log(e)},
    () => {},
    { enableHighAccuracy: false, timeout: 10000 }
);
