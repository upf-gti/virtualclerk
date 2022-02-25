import warnings


def language_presentation(engine, language):
    if language == 'en':
        voice = 'com.apple.speech.synthesis.voice.samantha'
        engine.setProperty('voice', voice)
        engine.setProperty('rate', 170)
        presentation = ("Hi! I'm the UPF's intelligent agent. I belong to the"
                        "Tecnotrack, a circuit in the Tanger Building, where "
                        "you can find the impact of the university on "
                        "scientific research. What are you looking for?")
    elif language == 'es':
        voice = 'com.apple.speech.synthesis.voice.monica'
        engine.setProperty('voice', voice)
        engine.setProperty('rate', 170)
        presentation = ("Hola! Soy el agente inteligente de la UPF. "
                        "Pertenezco al Tecnotrack, un circuito en el "
                        "edificio Tánger dónde se muestra el impacto de la "
                        "investigación de la universidad en los últimos "
                        "años. ¿Qué necesitas?")
    elif language == 'ca':
        warnings.warn("No available engine for Catalan")
        presentation = ("Hola! Sóc l'agent intel·ligent de l'UPF. Pertanyo al"
                        "Tecnotrack, un circuit en l'edifici Tànger on podeu "
                        "trobar l'impacte de la investigació de la "
                        "universitat en els últims anys. Què necessiteu?")
    return presentation
