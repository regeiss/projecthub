# 1. Cria a estrutura de pastas
mkdir -p login/resources/css meu-tema/login/resources/img

# 2. Cria o arquivo de propriedades do tema
cat <<EOF > meu-tema/login/theme.properties
parent=keycloak
import=common/keycloak
styles=css/style.css
EOF

# 3. Cria o arquivo CSS básico
cat <<EOF > login/resources/css/style.css
/* Personalização do Fundo */
body {
    background-image: url('../img/background.jpg');
    background-size: cover;
    background-attachment: fixed;
    background-repeat: no-repeat;
    background-color: #222; /* Fallback caso a imagem falhe */
}

/* Ajuste para deixar o formulário legível sobre o fundo */
.login-pf body {
    background-color: transparent;
}

#kc-header {
    display: none; /* Opcional: esconde o logo padrão do Keycloak */
}
EOF

# 4. Cria um arquivo vazio para a imagem (apenas para marcar o lugar)
touch login/resources/img/background.jpg

echo "Estrutura criada com sucesso na pasta 'meu-tema'!"
echo "IMPORTANTE: Substitua o arquivo 'meu-tema/login/resources/img/background.jpg' pela sua imagem real."