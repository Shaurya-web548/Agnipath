// Pre-written advisories for hours 0..6. The demo never depends on the network:
// these are always available, and the optional live-AI layer merely replaces them.

export type Urgency = "ADVISORY" | "WARNING" | "EVACUATE";

export type Advisory = {
  headline: string;
  advisory_en: string;
  advisory_hi: string;
  urgency: Urgency;
};

export const fallbackAdvisories: Advisory[] = [
  {
    headline: "Fire detected near Bhowali forest",
    advisory_en:
      "A fire has been detected near Bhowali forest at 05:40 IST (high confidence). Wind is pushing northeast at 18 km/h. No shelters are affected at this time. Residents should stay alert and keep evacuation kits ready. All five shelters are open.",
    advisory_hi:
      "भवाली वन के पास सुबह 05:40 बजे आग का पता चला है (उच्च विश्वसनीयता)। हवा 18 किमी/घंटा की गति से उत्तर-पूर्व की ओर बह रही है। इस समय कोई भी आश्रय स्थल प्रभावित नहीं है। निवासी सतर्क रहें और आपातकालीन किट तैयार रखें। सभी पाँच आश्रय स्थल खुले हैं।",
    urgency: "ADVISORY",
  },
  {
    headline: "Fire spreading northeast, monitor updates",
    advisory_en:
      "The fire front has extended about 1.8 km downwind toward the northeast. All shelters remain safe. Avoid forest tracks northeast of the fire point. Livestock owners in the Bhowali direction should begin moving animals now.",
    advisory_hi:
      "आग का मोर्चा उत्तर-पूर्व दिशा में लगभग 1.8 किमी तक फैल गया है। सभी आश्रय स्थल सुरक्षित हैं। आग के उत्तर-पूर्व के वन मार्गों से बचें। भवाली दिशा के पशुपालक अभी से पशुओं को हटाना शुरू करें।",
    urgency: "ADVISORY",
  },
  {
    headline: "Danger zone nearing Bhowali School Shelter",
    advisory_en:
      "The projected danger zone now reaches about 3.6 km and is closing on Bhowali School Shelter. Residents planning to use Bhowali School should divert to Nainital Community Hall or Haldwani Relief Camp instead. Avoid the Bhowali road.",
    advisory_hi:
      "अनुमानित खतरे का क्षेत्र अब लगभग 3.6 किमी तक पहुँच गया है और भवाली स्कूल आश्रय के निकट है। भवाली स्कूल जाने की योजना बना रहे निवासी नैनीताल सामुदायिक भवन या हल्द्वानी राहत शिविर जाएँ। भवाली मार्ग से बचें।",
    urgency: "WARNING",
  },
  {
    headline: "Bhowali School Shelter inside danger zone",
    advisory_en:
      "Bhowali School Shelter is now inside the projected danger zone and is closed. Anyone in that area must move immediately via the southern route. Nearest safe shelters: Nainital Community Hall (south) and Haldwani Relief Camp (southeast). Do not use the Bhowali road.",
    advisory_hi:
      "भवाली स्कूल आश्रय अब अनुमानित खतरे के क्षेत्र में है और बंद कर दिया गया है। उस क्षेत्र के सभी लोग तुरंत दक्षिणी मार्ग से निकलें। निकटतम सुरक्षित आश्रय: नैनीताल सामुदायिक भवन (दक्षिण) और हल्द्वानी राहत शिविर (दक्षिण-पूर्व)। भवाली मार्ग का उपयोग न करें।",
    urgency: "EVACUATE",
  },
  {
    headline: "Fire front at 7 km, Jeolikote at risk",
    advisory_en:
      "The fire front has reached about 7.2 km downwind. Jeolikote Panchayat Bhawan is expected to fall inside the danger zone within the hour — do not travel there. Nainital Community Hall, Haldwani Relief Camp and Ramgarh Health Centre remain safe.",
    advisory_hi:
      "आग का मोर्चा लगभग 7.2 किमी तक पहुँच चुका है। जियोलिकोट पंचायत भवन के एक घंटे के भीतर खतरे के क्षेत्र में आने की आशंका है — वहाँ यात्रा न करें। नैनीताल सामुदायिक भवन, हल्द्वानी राहत शिविर और रामगढ़ स्वास्थ्य केंद्र सुरक्षित हैं।",
    urgency: "WARNING",
  },
  {
    headline: "Jeolikote Panchayat Bhawan now unsafe",
    advisory_en:
      "Jeolikote Panchayat Bhawan is now inside the projected danger zone and is closed. Two shelters are unavailable. All evacuees must head south: Nainital Community Hall, Haldwani Relief Camp, or Ramgarh Health Centre. Keep northeast roads clear for emergency crews.",
    advisory_hi:
      "जियोलिकोट पंचायत भवन अब अनुमानित खतरे के क्षेत्र में है और बंद है। दो आश्रय स्थल अनुपलब्ध हैं। सभी लोग दक्षिण की ओर जाएँ: नैनीताल सामुदायिक भवन, हल्द्वानी राहत शिविर या रामगढ़ स्वास्थ्य केंद्र। आपातकालीन दलों के लिए उत्तर-पूर्वी सड़कें खाली रखें।",
    urgency: "EVACUATE",
  },
  {
    headline: "Danger zone at maximum projected extent",
    advisory_en:
      "At hour six the projected danger zone extends about 10.8 km northeast of the fire point. Bhowali School Shelter and Jeolikote Panchayat Bhawan remain closed. Three southern shelters are safe and operational. Follow instructions from district authorities.",
    advisory_hi:
      "छठे घंटे में अनुमानित खतरे का क्षेत्र आग के बिंदु से लगभग 10.8 किमी उत्तर-पूर्व तक फैला है। भवाली स्कूल आश्रय और जियोलिकोट पंचायत भवन बंद हैं। दक्षिण के तीन आश्रय स्थल सुरक्षित और चालू हैं। जिला प्रशासन के निर्देशों का पालन करें।",
    urgency: "EVACUATE",
  },
];
